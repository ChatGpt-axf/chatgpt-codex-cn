import fs from 'node:fs';
import path from 'node:path';
import { getBuildMap, getHtmlPages, getSitemapUrls, getUrlset, inspectLinks } from './build-site.mjs';
import { loadSiteConfig } from './content.mjs';
import { loadEnvFile } from './env.mjs';
import {
  ENGINE_IDS,
  crawlerAllowed,
  engineReportFile,
  getSearchSetting,
  loadSearchEngineMatrix,
  submissionFile,
  verificationConfigured,
} from './search-engines.mjs';
import { getProjectRootPath, getProjectRootUrl, withSiteBase } from './site-url.mjs';
import { writeProductionGuides } from './production-guides.mjs';

function readSubmissionLog() {
  const file = path.resolve('reports/submission-log.json');
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function addWarning(report, message) {
  if (!report.warnings.includes(message)) report.warnings.push(message);
}

function addError(report, message) {
  if (!report.errors.includes(message)) report.errors.push(message);
}

function automaticSubmissionState(id, config) {
  if (id === 'bing') return config.searchEngines.bing.indexNow && process.env.INDEXNOW_KEY ? 'CONFIGURED' : 'NOT CONFIGURED';
  if (id === 'baidu') return process.env.BAIDU_SITE && process.env.BAIDU_TOKEN ? 'CONFIGURED' : 'NOT CONFIGURED';
  return 'NOT SUPPORTED';
}

function automaticSubmissionAvailable(id, capability, setting) {
  if (id === 'bing') return Boolean(capability.supportsIndexNow && setting.indexNow);
  if (id === 'baidu') return Boolean(capability.supportsPushApi);
  return false;
}

export async function runSearchAudit({ write = true } = {}) {
  loadEnvFile();
  const config = loadSiteConfig();
  const matrix = loadSearchEngineMatrix();
  const pages = getHtmlPages();
  const buildMap = getBuildMap();
  const standard = getUrlset('sitemap.xml');
  const indexed = getSitemapUrls();
  const sogouXml = getUrlset('sitemap-sogou.xml');
  const robotsPath = path.resolve('dist/robots.txt');
  const robots = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, 'utf8') : '';
  const submissionLog = readSubmissionLog();
  const { incoming } = inspectLinks(pages, buildMap);
  const verificationRoutes = new Set(
    Object.values(config.searchEngines || {})
      .filter((engine) => engine.enabled && engine.verification?.method === 'html' && engine.verification.fileName)
      .map((engine) => withSiteBase(`/${engine.verification.fileName}`, config)),
  );
  const indexablePages = pages.filter((page) =>
    !verificationRoutes.has(page.route)
    && !page.$('meta[name="robots"]').attr('content')?.toLowerCase().includes('noindex'),
  );
  const reports = [];

  for (const id of ENGINE_IDS) {
    const capability = matrix.get(id);
    const setting = getSearchSetting(config, id);
    const enabled = Boolean(setting.enabled && capability.enabled !== false);
    const configured = verificationConfigured(setting);
    const report = {
      engine: capability.name,
      id,
      enabled,
      crawler: capability.crawler,
      crawlerAllowed: false,
      httpStatusReady: false,
      sitemapReady: false,
      verificationConfigured: configured,
      verificationStatus: capability.requiresVerification ? (configured ? 'CONFIGURED' : 'NOT CONFIGURED') : 'NOT REQUIRED',
      automaticSubmissionAvailable: automaticSubmissionAvailable(id, capability, setting),
      automaticSubmission: automaticSubmissionState(id, config),
      manualSubmissionRequired: false,
      lastSubmission: submissionLog[id]?.lastSubmission || null,
      submittedUrls: submissionLog[id]?.submittedUrls || 0,
      errors: [],
      warnings: [],
      status: 'READY',
    };

    if (!enabled) {
      report.status = 'DISABLED';
      reports.push(report);
      continue;
    }

    if (!robots) addError(report, 'robots.txt is missing.');
    else {
      report.crawlerAllowed = crawlerAllowed(robots, capability.crawler, withSiteBase('/guides/chatgpt/', config));
      if (!report.crawlerAllowed) addError(report, `${capability.crawler} is blocked from public content.`);
    }

    if (id === 'google' || id === 'bing' || id === 'ai') report.sitemapReady = indexed.files.length > 0 && indexed.urls.size > 0;
    else if (id === 'sogou') report.sitemapReady = sogouXml.exists && sogouXml.urls.size > 0 && buildMap.has(withSiteBase('/sitemap-sogou.txt', config));
    else report.sitemapReady = standard.exists && standard.urls.size > 0;
    if (!report.sitemapReady) addError(report, 'Required Sitemap output is missing or empty.');

    report.httpStatusReady = [...standard.urls].every((url) => buildMap.has(decodeURI(new URL(url).pathname)));
    if (!report.httpStatusReady) addError(report, 'One or more Sitemap URLs have no generated static response.');

    if (capability.requiresVerification && !report.verificationConfigured) {
      addWarning(report, `${capability.webmasterPlatform} verification is not configured.`);
    }

    const expectedUrls = new Set(indexablePages.map((page) => page.$('link[rel="canonical"]').attr('href')).filter(Boolean));
    if (standard.exists) {
      for (const url of expectedUrls) if (!standard.urls.has(url)) addError(report, `Standard Sitemap is missing canonical URL: ${url}`);
      for (const url of standard.urls) if (!standard.lastmod.get(url)) addError(report, `Sitemap URL has no lastmod: ${url}`);
    }

    for (const page of indexablePages) {
      const canonical = page.$('link[rel="canonical"]').attr('href');
      if (!canonical) addError(report, `Missing canonical: ${page.route}`);
      if (page.$('meta[name="viewport"]').length !== 1) addError(report, `Missing mobile viewport: ${page.route}`);
      if (page.$('main').text().replace(/\s+/g, '').length < 80) addError(report, `Primary HTML content is too small or JS-dependent: ${page.route}`);
      if (page.route !== getProjectRootPath(config) && (incoming.get(page.route) || 0) === 0) addError(report, `Orphan page: ${page.route}`);
    }

    if (id === 'google') {
      for (const page of indexablePages) if (page.$('script[type="application/ld+json"]').length === 0) addError(report, `Structured data missing: ${page.route}`);
    }
    if (id === 'baidu') {
      if (indexablePages.some((page) => !/^zh(?:-|$)/i.test(page.$('html').attr('lang') || ''))) addWarning(report, 'Some pages do not declare a Chinese HTML language.');
      if (indexablePages.some((page) => !/[\p{Script=Han}]/u.test(`${page.$('title').text()} ${page.$('meta[name="description"]').attr('content') || ''}`))) {
        addWarning(report, 'Some titles/descriptions contain no clear Chinese topic text.');
      }
      if (standard.urls.size > 50000) addError(report, 'Baidu direct Sitemap exceeds 50,000 URLs and must be split into direct URL-set files.');
    }
    if (id === 'shenma') {
      for (const page of indexablePages) if (Buffer.byteLength(page.html) > 500_000) addWarning(report, `Large mobile HTML document: ${page.route}`);
    }

    report.manualSubmissionRequired = Boolean(capability.supportsManualSubmission && report.automaticSubmission !== 'CONFIGURED');
    if ((id === 'bing' || id === 'baidu') && report.automaticSubmission !== 'CONFIGURED') {
      addWarning(report, `${capability.name} automatic submission credentials are not configured.`);
    }
    report.status = report.errors.length > 0 ? 'ERROR' : report.warnings.length > 0 ? 'WARNING' : 'READY';
    reports.push(report);
  }

  if (write) {
    fs.mkdirSync(path.resolve('reports'), { recursive: true });
    const submissionUrls = [...standard.urls].sort();
    for (const id of ENGINE_IDS.filter((engineId) => engineId !== 'ai')) {
      fs.writeFileSync(path.resolve(`reports/${submissionFile(id)}`), `${submissionUrls.join('\n')}\n`);
    }
    writeProductionGuides(config);
    for (const report of reports) {
      fs.writeFileSync(path.resolve(`reports/${engineReportFile(report.id)}`), `${JSON.stringify(report, null, 2)}\n`);
    }
    fs.writeFileSync(path.resolve('reports/search-engine-report.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), site: getProjectRootUrl(config), engines: reports }, null, 2)}\n`);
    const rows = reports.map((report) => `| ${report.engine} | ${report.enabled ? 'Yes' : 'No'} | ${report.crawlerAllowed ? 'Yes' : 'No'} | ${report.httpStatusReady ? 'Yes' : 'No'} | ${report.sitemapReady ? 'Yes' : 'No'} | ${report.verificationStatus} | ${report.automaticSubmissionAvailable ? 'Yes' : 'No'} | ${report.automaticSubmission} | ${report.manualSubmissionRequired ? 'Yes' : 'No'} | ${report.lastSubmission || '-'} | ${report.submittedUrls} | ${report.errors.length} | ${report.warnings.length} | ${report.status} |`);
    const markdown = [
      '# Search Engine Readiness',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '| Engine | Enabled | Crawler Allowed | HTTP Ready | Sitemap Ready | Verification Status | Automatic Submission Available | Automatic Submission Configuration | Manual Required | Last Submission | Submitted URLs | Errors | Warnings | Status |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |',
      ...rows,
      '',
      'Submission and Sitemap discovery do not guarantee crawling, indexing, ranking, or citation.',
      '',
    ].join('\n');
    fs.writeFileSync(path.resolve('reports/search-engine-report.md'), markdown);
  }
  return reports;
}
