import { getBuildMap, getHtmlPages, getSitemapUrls, inspectLinks } from './lib/build-site.mjs';
import { loadSiteConfig, readContent } from './lib/content.mjs';
import { AuditReport } from './lib/report.mjs';
import { absoluteSiteUrl, getProjectRootPath, withSiteBase } from './lib/site-url.mjs';

const site = loadSiteConfig();
const pages = getHtmlPages();
const buildMap = getBuildMap();
const sitemap = getSitemapUrls();
const report = new AuditReport('SEO Audit Summary', pages.length);
const titleOwners = new Map();
const descriptionOwners = new Map();
const canonicalOwners = new Map();
const indexableRoutes = new Set();

function addOwner(map, value, route) {
  if (!value) return;
  const owners = map.get(value) || [];
  owners.push(route);
  map.set(value, owners);
}

for (const page of pages) {
  const { $, route } = page;
  const title = $('title').first().text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim() || '';
  const robots = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';
  const noindex = robots.includes('noindex');
  const canonicalNodes = $('link[rel="canonical"]');
  const canonical = canonicalNodes.first().attr('href') || '';

  if (!title) report.error('missing-title', 'Missing title', route);
  else if (title.length < 8) report.warn('short-title', `Title is only ${title.length} characters`, route);
  else if (title.length > 65) report.warn('long-title', `Title is ${title.length} characters`, route);
  else report.pass();

  if (!description) report.error('missing-description', 'Missing meta description', route);
  else if (description.length < 35) report.warn('short-description', `Description is only ${description.length} characters`, route);
  else if (description.length > 180) report.warn('long-description', `Description is ${description.length} characters`, route);
  else report.pass();

  const h1Count = $('h1').length;
  if (h1Count === 0) report.error('missing-h1', 'Page has no H1', route);
  else if (h1Count > 1) report.error('multiple-h1', `Page has ${h1Count} H1 elements`, route);
  else report.pass();

  if (canonicalNodes.length !== 1 || !canonical) {
    report.error('canonical-count', `Expected one canonical, found ${canonicalNodes.length}`, route);
  } else {
    try {
      const parsed = new URL(canonical);
      if (parsed.origin !== new URL(site.site.url).origin) report.error('canonical-origin', `Wrong canonical origin: ${canonical}`, route);
      else if (route !== withSiteBase('/404.html', site) && decodeURI(parsed.pathname) !== route) report.error('canonical-path', `Canonical path ${parsed.pathname} does not match ${route}`, route);
      else report.pass();
    } catch {
      report.error('canonical-invalid', `Invalid canonical URL: ${canonical}`, route);
    }
  }

  if (!$('html').attr('lang')) report.error('missing-lang', 'HTML lang is missing', route);
  else report.pass();
  if ($('main').length !== 1) report.error('semantic-main', `Expected one main element, found ${$('main').length}`, route);
  else report.pass();
  if (!$('meta[property="og:title"]').length || !$('meta[property="og:description"]').length || !$('meta[property="og:image"]').length) {
    report.error('open-graph', 'Required Open Graph metadata is incomplete', route);
  } else report.pass();

  $('img').each((_, image) => {
    if ($(image).attr('alt') === undefined) report.error('missing-alt', `Image without alt: ${$(image).attr('src') || 'unknown'}`, route);
    else report.pass();
  });

  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      JSON.parse($(script).text());
      report.pass();
    } catch (error) {
      report.error('schema-json', `Invalid JSON-LD: ${error.message}`, route);
    }
  });

  if (!noindex) {
    indexableRoutes.add(route);
    addOwner(titleOwners, title, route);
    addOwner(descriptionOwners, description, route);
    addOwner(canonicalOwners, canonical, route);
    if (!sitemap.urls.has(canonical)) report.error('sitemap-missing-page', `Indexable canonical is missing from sitemap: ${canonical}`, route);
    else report.pass();
  } else if (sitemap.urls.has(canonical)) {
    report.error('noindex-in-sitemap', `Noindex page appears in sitemap: ${canonical}`, route);
  } else report.pass();
}

for (const [value, owners] of titleOwners) if (owners.length > 1) report.error('duplicate-title', `Duplicate title on ${owners.join(', ')}: ${value}`);
for (const [value, owners] of descriptionOwners) if (owners.length > 1) report.error('duplicate-description', `Duplicate description on ${owners.join(', ')}: ${value}`);
for (const [value, owners] of canonicalOwners) if (owners.length > 1) report.error('duplicate-canonical', `Duplicate canonical on ${owners.join(', ')}: ${value}`);

const content = readContent();
const slugOwners = new Map();
for (const entry of content) {
  addOwner(slugOwners, entry.slug, entry.file);
  if (!entry.data.updated) report.error('missing-updated', 'Content is missing updated date', entry.file);
  else report.pass();
  if (!entry.data.draft && (entry.data.pillar || ['comparison', 'troubleshooting'].includes(entry.data.intent)) && !(entry.data.sources || []).length) {
    report.error('missing-sources', 'Important published content has no sources', entry.file);
  } else report.pass();
  const canonical = absoluteSiteUrl(entry.url, site);
  if (entry.data.draft && buildMap.has(entry.url)) report.error('draft-indexed', `Draft generated a public route: ${entry.url}`, entry.file);
  if ((entry.data.draft || entry.data.noindex) && sitemap.urls.has(canonical)) report.error('excluded-in-sitemap', `Draft/noindex content appears in sitemap: ${canonical}`, entry.file);
}
for (const [slug, owners] of slugOwners) if (owners.length > 1) report.error('duplicate-slug', `Slug "${slug}" is reused by ${owners.join(', ')}`);

const { broken, incoming } = inspectLinks(pages, buildMap);
for (const item of broken) report.error('broken-link', `${item.href} from ${item.from}: ${item.reason}`);
for (const route of indexableRoutes) {
  if (route !== getProjectRootPath(site) && (incoming.get(route) || 0) === 0) report.error('orphan-page', 'Indexable page has no internal incoming links', route);
}
if (broken.length === 0) report.pass();

if (sitemap.files.length === 0) report.error('missing-sitemap', 'sitemap-index.xml was not generated');
else report.pass();

report.print();
