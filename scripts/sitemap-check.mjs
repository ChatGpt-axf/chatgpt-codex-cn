import { getHtmlPages, getSitemapUrls, getUrlset } from './lib/build-site.mjs';
import { loadSiteConfig, readContent } from './lib/content.mjs';
import { AuditReport } from './lib/report.mjs';
import { absoluteSiteUrl } from './lib/site-url.mjs';

const site = loadSiteConfig();
const pages = getHtmlPages();
const sitemap = getSitemapUrls();
const standard = getUrlset('sitemap.xml');
const report = new AuditReport('Sitemap Check Summary', standard.urls.size);
const canonicalPages = new Map();

if (sitemap.files.length === 0) report.error('missing-sitemap', 'dist/sitemap-index.xml is missing or has no readable child sitemap');
if (!standard.exists) report.error('missing-standard-sitemap', 'dist/sitemap.xml is missing');

for (const page of pages) {
  const canonical = page.$('link[rel="canonical"]').attr('href');
  if (canonical) canonicalPages.set(canonical, page);
}

for (const url of sitemap.urls) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    report.error('invalid-url', `Invalid sitemap URL: ${url}`);
    continue;
  }
  if (parsed.origin !== new URL(site.site.url).origin) report.error('wrong-origin', `Sitemap URL uses a different origin: ${url}`);
  else report.pass();
  const page = canonicalPages.get(url);
  if (!page) report.error('noncanonical-url', `Sitemap URL does not match a generated canonical page: ${url}`);
  else if (page.$('meta[name="robots"]').attr('content')?.toLowerCase().includes('noindex')) report.error('noindex-url', `Noindex page appears in sitemap: ${url}`);
  else report.pass();
}

for (const url of standard.urls) {
  const page = canonicalPages.get(url);
  if (!page) report.error('standard-noncanonical-url', `Standard Sitemap URL does not match a generated canonical page: ${url}`);
  else if (page.$('meta[name="robots"]').attr('content')?.toLowerCase().includes('noindex')) report.error('standard-noindex-url', `Noindex page appears in standard Sitemap: ${url}`);
  else report.pass();
  if (!standard.lastmod.get(url)) report.error('standard-missing-lastmod', `Standard Sitemap URL has no lastmod: ${url}`);
  else report.pass();
  if (!sitemap.urls.has(url)) report.error('index-mismatch', `Standard Sitemap URL is missing from sitemap-index output: ${url}`);
}

for (const url of sitemap.urls) {
  if (!standard.urls.has(url)) report.error('standard-mismatch', `sitemap-index URL is missing from standard Sitemap: ${url}`);
}

for (const [canonical, page] of canonicalPages) {
  const noindex = page.$('meta[name="robots"]').attr('content')?.toLowerCase().includes('noindex');
  if (!noindex && (!sitemap.urls.has(canonical) || !standard.urls.has(canonical))) report.error('missing-url', `Indexable canonical missing from a Sitemap output: ${canonical}`, page.route);
}

for (const entry of readContent()) {
  const canonical = absoluteSiteUrl(entry.url, site);
  if (entry.data.draft || entry.data.noindex) {
    if (sitemap.urls.has(canonical) || standard.urls.has(canonical)) report.error('excluded-content', `Draft/noindex URL appears in Sitemap: ${canonical}`, entry.file);
    else report.pass();
  } else {
    if (!sitemap.urls.has(canonical) || !standard.urls.has(canonical)) report.error('published-missing', `Published content is missing from a Sitemap output: ${canonical}`, entry.file);
    else if (!sitemap.lastmod.get(canonical) || !standard.lastmod.get(canonical)) report.error('missing-lastmod', `Published content has no lastmod in a Sitemap output: ${canonical}`, entry.file);
    else report.pass(2);
  }
}

report.print();
