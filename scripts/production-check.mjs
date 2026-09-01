import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { getBuildMap, getHtmlPages, getSitemapUrls, getUrlset } from './lib/build-site.mjs';
import { loadSiteConfig } from './lib/content.mjs';
import { writeProductionGuides } from './lib/production-guides.mjs';
import {
  getProjectRootUrl,
  isProjectUrl,
  normalizeBasePath,
  withSiteBase,
} from './lib/site-url.mjs';

const config = loadSiteConfig();
const expectedOrigin = new URL(config.site.url).origin;
const expectedBase = normalizeBasePath(config.site.base);
const expectedBaseLabel = expectedBase === '/' ? '/' : `${expectedBase}/`;
const escapedOrigin = expectedOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const baseDir = expectedBase.replace(/^\//, '');
const rootDeployment = expectedBase === '/';
const projectUrl = getProjectRootUrl(config);
const pages = getHtmlPages();
const buildMap = getBuildMap();
const standard = getUrlset('sitemap.xml');
const indexed = getSitemapUrls();
const errors = [];
const warnings = [];
const verificationRoutes = new Set(
  Object.values(config.searchEngines || {})
    .filter((engine) => engine.enabled && engine.verification?.method === 'html' && engine.verification.fileName)
    .map((engine) => withSiteBase(`/${engine.verification.fileName}`, config)),
);

function error(code, message, file = '') { errors.push({ code, message, file }); }
function warn(code, message, file = '') { warnings.push({ code, message, file }); }
function isSkipped(value) { return !value || /^(?:#|mailto:|tel:|javascript:|data:|blob:)/i.test(value); }
function checkProjectReference(value, page, kind) {
  if (isSkipped(value)) return;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.origin === expectedOrigin && !isProjectUrl(value, config)) error('outside-project', `${kind} escapes ${expectedBaseLabel}: ${value}`, page.route);
    return;
  }
  if (!rootDeployment && value.startsWith('/') && !(value === expectedBase || value.startsWith(`${expectedBase}/`))) {
    error('root-path', `${kind} uses a main-site root path: ${value}`, page.route);
    return;
  }
  const resolved = new URL(value, `${expectedOrigin}${page.route}`).toString();
  if (!isProjectUrl(resolved, config)) error('outside-project', `${kind} resolves outside ${expectedBaseLabel}: ${value}`, page.route);
}

writeProductionGuides(config);

if (config.site.base !== config.site.basePath) error('site-base-alias', 'site.base and site.basePath must match.');
if (config.site.url !== config.site.baseUrl) error('site-url-alias', 'site.url and site.baseUrl must match.');
if (config.site.publicUrl !== projectUrl) error('site-public-url', `site.publicUrl must be ${projectUrl}`);
if (!fs.existsSync(path.resolve('dist/index.html'))) error('dist-layout', 'dist/index.html is missing; uploadable project files are not at the dist root.');
if (baseDir && fs.existsSync(path.resolve('dist', baseDir, 'index.html'))) {
  error('double-base-output', `dist/${baseDir}/index.html would create a duplicated ${expectedBaseLabel}${baseDir}/ deployment path.`);
}

for (const page of pages) {
  if (verificationRoutes.has(page.route)) continue;
  const canonical = page.$('link[rel="canonical"]').attr('href') || '';
  if (!canonical || !isProjectUrl(canonical, config)) error('canonical-base', `Canonical is outside ${projectUrl}: ${canonical || 'missing'}`, page.route);
  else if (page.route !== withSiteBase('/404.html', config) && decodeURI(new URL(canonical).pathname) !== page.route) {
    error('canonical-route', `Canonical path does not match generated route: ${canonical}`, page.route);
  }
  page.$('a[href], form[action]').each((_, node) => checkProjectReference(page.$(node).attr('href') || page.$(node).attr('action') || '', page, 'Internal link'));
  page.$('script[src], img[src], source[src], video[poster], link[href]').each((_, node) => {
    const value = page.$(node).attr('src') || page.$(node).attr('poster') || page.$(node).attr('href') || '';
    checkProjectReference(value, page, 'Asset or metadata URL');
    if (value.startsWith(expectedBase) && !value.includes('?') && !value.includes('#') && !buildMap.has(decodeURI(value))) {
      error('missing-asset', `Referenced project file is missing from dist: ${value}`, page.route);
    }
  });
  page.$('meta[property="og:image"], meta[name="twitter:image"]').each((_, node) => checkProjectReference(page.$(node).attr('content') || '', page, 'Social image'));
  if (!rootDeployment && /["'(]\/_astro\//.test(page.html)) error('root-astro-asset', 'HTML contains a root /_astro/ asset reference.', page.route);
}

for (const url of new Set([...standard.urls, ...indexed.urls])) {
  if (!isProjectUrl(url, config)) error('sitemap-boundary', `Sitemap URL is outside ${projectUrl}: ${url}`);
}
if (!standard.exists || standard.urls.size === 0) error('sitemap-missing', 'dist/sitemap.xml is missing or empty.');
for (const url of standard.urls) if (!standard.lastmod.get(url)) error('sitemap-lastmod', `Sitemap URL has no lastmod: ${url}`);

const sitemapFiles = fg.sync('dist/**/*sitemap*.xml', { onlyFiles: true });
for (const file of sitemapFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (!isProjectUrl(match[1], config)) error('sitemap-reference', `Sitemap reference is outside ${projectUrl}: ${match[1]}`, file);
  }
}

for (const file of fg.sync('dist/**/*.{html,xml,txt,css,js,json}', { onlyFiles: true })) {
  const content = fs.readFileSync(file, 'utf8');
  for (const forbidden of ['knowledge.example', 'example.com', 'localhost', '127.0.0.1']) {
    if (content.includes(forbidden)) error('placeholder-url', `Production output contains ${forbidden}`, file);
  }
  const rootUrlPattern = new RegExp(`${escapedOrigin}/(?!${baseDir ? `${baseDir}/` : ''})`);
  if (baseDir && /\.(?:html|xml|json)$/.test(file) && rootUrlPattern.test(content)) {
    error('root-production-url', `Production output contains a same-origin URL outside ${expectedBaseLabel}.`, file);
  }
  if (file.endsWith('.css')) {
    for (const match of content.matchAll(/url\((['"]?)(\/[^)'"\s]+)\1\)/g)) {
      if (expectedBase !== '/' && !(match[2] === expectedBase || match[2].startsWith(`${expectedBase}/`))) {
        error('root-css-asset', `CSS URL escapes ${expectedBaseLabel}: ${match[2]}`, file);
      }
    }
  }
}

const advisoryRobots = path.resolve('dist/robots.txt');
const recommendedRobots = path.resolve('reports/root-robots-recommended.txt');
const robotsContent = fs.existsSync(advisoryRobots) ? fs.readFileSync(advisoryRobots, 'utf8') : '';
if (!robotsContent) {
  error('robots-role', `${expectedBaseLabel}robots.txt is missing.`);
} else if (rootDeployment) {
  if (robotsContent.includes('Advisory only')) error('robots-role', 'Root deployment robots.txt must be authoritative, not advisory.');
  if (!robotsContent.includes(`Sitemap: ${projectUrl}sitemap.xml`)) error('robots-sitemap', 'Root robots.txt has the wrong Sitemap URL.');
} else if (!robotsContent.includes('Advisory only')) {
  error('robots-role', `${expectedBaseLabel}robots.txt must identify itself as advisory, not the authoritative root robots file.`);
}
if (!rootDeployment) {
  if (!fs.existsSync(recommendedRobots)) error('robots-recommendation', 'reports/root-robots-recommended.txt is missing.');
  else if (!fs.readFileSync(recommendedRobots, 'utf8').includes(`Sitemap: ${projectUrl}sitemap.xml`)) {
    error('robots-sitemap', 'Root robots recommendation has the wrong Sitemap URL.');
  }
}

for (const id of ['google', 'bing', 'baidu', '360', 'sogou', 'shenma']) {
  const file = path.resolve(`reports/${id}-submit-urls.txt`);
  if (!fs.existsSync(file)) { error('submission-list', `Missing submission URL file: ${file}`); continue; }
  for (const value of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
    if (!isProjectUrl(value, config)) error('submission-boundary', `${id} submission URL escapes ${expectedBaseLabel}: ${value}`, file);
  }
}

const searchReportFile = path.resolve('reports/search-engine-report.json');
if (!fs.existsSync(searchReportFile)) error('search-report', 'Search engine report is missing.');
else {
  const report = JSON.parse(fs.readFileSync(searchReportFile, 'utf8'));
  if (report.site !== projectUrl) error('search-report-site', `Search report site must be ${projectUrl}; found ${report.site}`);
}

if (!process.env.INDEXNOW_KEY) warn('indexnow-key', 'INDEXNOW_KEY is not configured; no live IndexNow submission can occur.');
if (!rootDeployment || config.site.status !== 'active') {
  warn('prelaunch-domain', 'Production domain and root robots ownership are not configured for this prelaunch site.');
}

const report = {
  generatedAt: new Date().toISOString(),
  productionUrl: projectUrl,
  site: expectedOrigin,
  base: expectedBase,
  status: errors.length > 0 ? 'FAIL' : 'PASS',
  totals: { pages: pages.length, sitemapUrls: standard.urls.size, errors: errors.length, warnings: warnings.length },
  errors,
  warnings,
};
fs.mkdirSync(path.resolve('reports'), { recursive: true });
fs.writeFileSync(path.resolve('reports/production-check.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.resolve('reports/production-check.md'), [
  '# Production Check', '',
  `- Status: ${report.status}`,
  `- Production URL: ${projectUrl}`,
  `- Pages: ${pages.length}`,
  `- Sitemap URLs: ${standard.urls.size}`,
  `- Errors: ${errors.length}`,
  `- Warnings: ${warnings.length}`,
  '',
  ...errors.map((item) => `- ERROR [${item.code}] ${item.message}${item.file ? ` (${item.file})` : ''}`),
  ...warnings.map((item) => `- WARNING [${item.code}] ${item.message}${item.file ? ` (${item.file})` : ''}`),
  '',
].join('\n'));

for (const item of errors) console.error(`ERROR [${item.code}] ${item.message}${item.file ? ` (${item.file})` : ''}`);
for (const item of warnings) console.warn(`WARN  [${item.code}] ${item.message}${item.file ? ` (${item.file})` : ''}`);
console.log('\nProduction Check Summary');
console.log(`Status: ${report.status}`);
console.log(`Production URL: ${projectUrl}`);
console.log(`Pages: ${pages.length}`);
console.log(`Sitemap URLs: ${standard.urls.size}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
if (errors.length > 0) process.exitCode = 1;
