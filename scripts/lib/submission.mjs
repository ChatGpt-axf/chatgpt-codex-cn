import fs from 'node:fs';
import path from 'node:path';
import { getUrlset } from './build-site.mjs';
import { loadSiteConfig, readContent } from './content.mjs';
import { loadEnvFile } from './env.mjs';
import { getSearchSetting, loadSearchEngineMatrix, submissionFile } from './search-engines.mjs';
import { absoluteSiteUrl, getProjectRootUrl, isProjectUrl } from './site-url.mjs';

export const SUBMISSION_STATUSES = [
  'AUTO SUBMITTED',
  'MANUAL SUBMISSION REQUIRED',
  'NOT CONFIGURED',
  'FAILED',
];

const SUBMITTABLE_ENGINES = ['google', 'bing', 'baidu', 'so360', 'sogou', 'shenma'];
const ACTIONS = new Set(['new', 'update', 'delete']);

function asList(value) {
  if (!value || value === true) return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function writeUrlFile(id, urls) {
  fs.mkdirSync(path.resolve('reports'), { recursive: true });
  const file = path.resolve(`reports/${submissionFile(id)}`);
  fs.writeFileSync(file, `${urls.join('\n')}${urls.length ? '\n' : ''}`);
  return path.relative(process.cwd(), file).replace(/\\/g, '/');
}

function validateUrls(urls, config) {
  const result = [];
  for (const value of urls) {
    const url = new URL(/^https?:\/\//i.test(value) ? value : absoluteSiteUrl(value, config));
    if (!isProjectUrl(url.toString(), config)) throw new Error(`Refusing to submit a URL outside the configured project path: ${url}`);
    result.push(url.toString());
  }
  return [...new Set(result)];
}

export function collectSubmissionUrls(options = {}) {
  const config = loadSiteConfig();
  const explicit = [
    ...(options.url && options.url !== true ? [String(options.url)] : []),
    ...asList(options.urls),
  ];
  if (explicit.length > 0) return validateUrls(explicit, config);

  if (options.latest) {
    const limit = Math.max(1, Number(options.latest === true ? 10 : options.latest));
    const latest = readContent({ includeDrafts: false })
      .filter((entry) => !entry.data.noindex)
      .sort((left, right) => new Date(right.data.updated) - new Date(left.data.updated))
      .slice(0, limit)
      .map((entry) => absoluteSiteUrl(entry.url, config));
    return validateUrls(latest, config);
  }

  const sitemap = getUrlset('sitemap.xml');
  if (!sitemap.exists || sitemap.urls.size === 0) {
    throw new Error('dist/sitemap.xml is missing or empty. Run npm run build first.');
  }
  return validateUrls([...sitemap.urls], config);
}

function readSubmissionLog() {
  const file = path.resolve('reports/submission-log.json');
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function writeSubmissionLog(results) {
  const file = path.resolve('reports/submission-log.json');
  const log = readSubmissionLog();
  const attemptedAt = new Date().toISOString();
  for (const result of results) {
    const current = log[result.id] || {};
    log[result.id] = {
      ...current,
      lastAttempt: attemptedAt,
      lastStatus: result.status,
      action: result.action,
      preparedUrls: result.preparedUrls,
      urlFile: result.urlFile,
      ...(result.status === 'AUTO SUBMITTED' ? {
        lastSubmission: attemptedAt,
        submittedUrls: result.submittedUrls,
      } : {}),
    };
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(log, null, 2)}\n`);
}

async function submitIndexNow(config, urls) {
  const siteUrl = new URL(getProjectRootUrl(config));
  const key = process.env.INDEXNOW_KEY;
  const endpoint = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION || new URL(`${key}.txt`, siteUrl).toString();
  if (!isProjectUrl(keyLocation, config)) {
    throw new Error(`INDEXNOW_KEY_LOCATION must stay inside ${getProjectRootUrl(config)} to protect the main site root.`);
  }
  const payload = {
    host: siteUrl.host,
    key,
    keyLocation,
    urlList: urls,
  };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`IndexNow request failed (${response.status} ${response.statusText}): ${detail.slice(0, 300)}`);
  }
  return response.status;
}

async function submitBaidu(config, urls, mode) {
  const site = process.env.BAIDU_SITE || getProjectRootUrl(config);
  const token = process.env.BAIDU_TOKEN;
  const customEndpoint = mode === 'fast' ? process.env.BAIDU_FAST_ENDPOINT : process.env.BAIDU_ENDPOINT;
  if (new URL(site).toString() !== getProjectRootUrl(config)) {
    throw new Error(`BAIDU_SITE must exactly match the project URL prefix: ${getProjectRootUrl(config)}`);
  }
  if (mode === 'fast' && !customEndpoint) {
    throw new Error('BAIDU_FAST_ENDPOINT is not configured. Fast submission requires explicit account entitlement.');
  }
  const endpoint = new URL(customEndpoint || 'https://data.zz.baidu.com/urls');
  if (!endpoint.searchParams.has('site')) endpoint.searchParams.set('site', site);
  if (!endpoint.searchParams.has('token')) endpoint.searchParams.set('token', token);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: urls.join('\n'),
    signal: AbortSignal.timeout(20_000),
  });
  const detail = await response.text();
  if (!response.ok) throw new Error(`Baidu request failed (${response.status} ${response.statusText}): ${detail.slice(0, 300)}`);
  let payload = null;
  try { payload = JSON.parse(detail); } catch { payload = { response: detail.slice(0, 300) }; }
  return { status: response.status, payload };
}

function baseResult(id, capability, action, urls, urlFile) {
  return {
    id,
    engine: capability.name,
    action,
    status: 'NOT CONFIGURED',
    preparedUrls: urls.length,
    submittedUrls: 0,
    urlFile,
    message: '',
    webmasterUrl: capability.webmasterUrl,
  };
}

export async function runEngineSubmission(id, options = {}) {
  loadEnvFile();
  if (!SUBMITTABLE_ENGINES.includes(id)) throw new Error(`Unsupported submission engine: ${id}`);
  const action = String(options.action || 'update').toLowerCase();
  if (!ACTIONS.has(action)) throw new Error(`Unsupported action: ${action}. Use new, update, or delete.`);

  const config = loadSiteConfig();
  const capability = loadSearchEngineMatrix().get(id);
  const setting = getSearchSetting(config, id);
  const urls = collectSubmissionUrls(options);
  const urlFile = writeUrlFile(id, urls);
  const result = baseResult(id, capability, action, urls, urlFile);

  if (!setting.enabled || capability.enabled === false) {
    result.message = `${capability.name} is disabled in the active site configuration.`;
    return result;
  }

  if (options['prepare-only'] || options['dry-run']) {
    if (id === 'bing') {
      result.status = setting.indexNow && process.env.INDEXNOW_KEY ? 'READY FOR AUTO SUBMISSION' : 'NOT CONFIGURED';
      result.message = process.env.INDEXNOW_KEY
        ? `Prepared ${urls.length} URL(s) for IndexNow; no network request was made.`
        : `BING INDEXNOW NOT CONFIGURED. Prepared ${urls.length} URL(s) without a network request.`;
    } else if (id === 'baidu') {
      result.status = process.env.BAIDU_SITE && process.env.BAIDU_TOKEN ? 'READY FOR AUTO SUBMISSION' : 'NOT CONFIGURED';
      result.message = process.env.BAIDU_SITE && process.env.BAIDU_TOKEN
        ? `Prepared ${urls.length} URL(s) for the Baidu API; no network request was made.`
        : `BAIDU SUBMISSION NOT CONFIGURED. Prepared ${urls.length} URL(s) for manual use.`;
    } else {
      result.status = capability.supportsManualSubmission ? 'MANUAL SUBMISSION REQUIRED' : 'NOT CONFIGURED';
      result.message = `Prepared ${urls.length} URL(s); no network request was made.`;
    }
    return result;
  }

  try {
    if (id === 'bing') {
      if (!setting.indexNow || !process.env.INDEXNOW_KEY) {
        result.message = 'BING INDEXNOW NOT CONFIGURED. Set INDEXNOW_KEY after publishing its verification file.';
        return result;
      }
      const status = await submitIndexNow(config, urls);
      result.status = 'AUTO SUBMITTED';
      result.submittedUrls = urls.length;
      result.message = `IndexNow accepted the request with HTTP ${status}. This does not guarantee indexing.`;
      return result;
    }

    if (id === 'baidu') {
      if (!process.env.BAIDU_SITE || !process.env.BAIDU_TOKEN) {
        result.message = 'BAIDU SUBMISSION NOT CONFIGURED. Verify the site and add BAIDU_SITE/BAIDU_TOKEN to .env.';
        return result;
      }
      const response = await submitBaidu(config, urls, String(options.mode || 'normal'));
      result.status = 'AUTO SUBMITTED';
      result.submittedUrls = urls.length;
      result.message = `Baidu accepted the request with HTTP ${response.status}. This does not guarantee inclusion.`;
      result.providerResponse = response.payload;
      return result;
    }

    result.status = 'MANUAL SUBMISSION REQUIRED';
    if (id === 'google') result.message = 'GOOGLE SEARCH CONSOLE SUBMISSION REQUIRED. Submit the Sitemap after site verification.';
    if (id === 'so360') result.message = '360 MANUAL/WEBMASTER SUBMISSION REQUIRED. Use the generated URL file and Sitemap.';
    if (id === 'sogou') result.message = 'SOGOU MANUAL SUBMISSION REQUIRED. Webmaster Sitemap access may depend on account eligibility.';
    if (id === 'shenma') result.message = 'SHENMA MANUAL/WEBMASTER SUBMISSION REQUIRED. Use the generated URL file and Sitemap.';
    return result;
  } catch (error) {
    result.status = 'FAILED';
    result.message = error instanceof Error ? error.message : String(error);
    return result;
  }
}

export async function runSubmissions(ids, options = {}) {
  const results = [];
  for (const id of ids) results.push(await runEngineSubmission(id, options));
  writeSubmissionLog(results);
  return results;
}

export function printSubmissionResults(results, { preparing = false } = {}) {
  console.log(preparing ? '\nSUBMISSION URL PREPARATION' : '\nSEARCH ENGINE SUBMISSION');
  for (const result of results) {
    console.log(`${result.engine}: ${result.status}`);
    console.log(`  ${result.message}`);
    console.log(`  URLs: ${result.preparedUrls}; file: ${result.urlFile}`);
  }
  console.log('\nSubmission only notifies or prepares data for a platform; it never guarantees crawling, indexing, ranking, or citation.');
}

export { SUBMITTABLE_ENGINES };
