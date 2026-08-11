import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import * as cheerio from 'cheerio';
import { loadSiteConfig } from './content.mjs';
import { normalizeBasePath, withSiteBase } from './site-url.mjs';

export function routeForFile(file, distDir = path.resolve('dist')) {
  const config = loadSiteConfig();
  const relative = path.relative(distDir, file).replace(/\\/g, '/');
  let route;
  if (relative === 'index.html') route = '/';
  else if (relative.endsWith('/index.html')) route = `/${relative.slice(0, -'index.html'.length)}`;
  else route = `/${relative}`;
  const base = normalizeBasePath(config.site.base);
  if (base !== '/' && (route === base || route.startsWith(`${base}/`))) return route;
  return withSiteBase(route, config);
}

export function getBuildMap(distDir = path.resolve('dist')) {
  if (!fs.existsSync(distDir)) throw new Error('dist/ not found. Run npm run build first.');
  const map = new Map();
  for (const file of fg.sync(`${distDir.replace(/\\/g, '/')}/**/*`, { onlyFiles: true })) {
    map.set(decodeURI(routeForFile(file, distDir)), file);
  }
  return map;
}

export function getHtmlPages(distDir = path.resolve('dist')) {
  return fg.sync(`${distDir.replace(/\\/g, '/')}/**/*.html`).map((file) => {
    const html = fs.readFileSync(file, 'utf8');
    return { file, route: decodeURI(routeForFile(file, distDir)), html, $: cheerio.load(html) };
  });
}

export function normalizeInternalPath(href, fromRoute) {
  const parsed = new URL(href, `https://local.invalid${fromRoute}`);
  let pathname = decodeURI(parsed.pathname);
  if (!path.extname(pathname) && !pathname.endsWith('/')) pathname += '/';
  return { pathname, hash: decodeURIComponent(parsed.hash.replace(/^#/, '')) };
}

export function inspectLinks(pages, buildMap = getBuildMap()) {
  const broken = [];
  const incoming = new Map(pages.map((page) => [page.route, 0]));
  const pageByRoute = new Map(pages.map((page) => [page.route, page]));
  for (const page of pages) {
    page.$('a[href]').each((_, element) => {
      const href = page.$(element).attr('href') || '';
      if (!href || /^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)) return;
      let target;
      try {
        target = normalizeInternalPath(href, page.route);
      } catch {
        broken.push({ from: page.route, href, reason: 'invalid URL' });
        return;
      }
      if (!buildMap.has(target.pathname)) {
        broken.push({ from: page.route, href, reason: `missing target ${target.pathname}` });
        return;
      }
      if (incoming.has(target.pathname) && target.pathname !== page.route) incoming.set(target.pathname, incoming.get(target.pathname) + 1);
      if (target.hash && pageByRoute.has(target.pathname)) {
        const targetPage = pageByRoute.get(target.pathname);
        const exists = targetPage.$(`[id="${target.hash.replace(/"/g, '\\"')}"]`).length > 0;
        if (!exists) broken.push({ from: page.route, href, reason: `missing fragment #${target.hash}` });
      }
    });
  }
  return { broken, incoming };
}

export function getSitemapUrls(distDir = path.resolve('dist')) {
  const config = loadSiteConfig();
  const baseDir = normalizeBasePath(config.site.base).replace(/^\//, '');
  const candidates = [path.join(distDir, 'sitemap-index.xml'), path.join(distDir, baseDir, 'sitemap-index.xml')];
  const indexPath = candidates.find((file) => fs.existsSync(file)) || candidates[0];
  if (!fs.existsSync(indexPath)) return { urls: new Set(), lastmod: new Map(), files: [] };
  const files = [];
  const indexXml = fs.readFileSync(indexPath, 'utf8');
  const $index = cheerio.load(indexXml, { xmlMode: true });
  const sitemapFiles = $index('sitemap > loc').map((_, node) => {
    const location = $index(node).text().trim();
    const pathname = new URL(location).pathname;
    const relative = normalizeBasePath(config.site.base) !== '/' && pathname.startsWith(`${normalizeBasePath(config.site.base)}/`)
      ? pathname.slice(normalizeBasePath(config.site.base).length)
      : pathname;
    return path.join(path.dirname(indexPath), relative.replace(/^\//, ''));
  }).get();
  if (sitemapFiles.length === 0) sitemapFiles.push(indexPath);
  const urls = new Set();
  const lastmod = new Map();
  for (const file of sitemapFiles) {
    if (!fs.existsSync(file)) continue;
    files.push(file);
    const $ = cheerio.load(fs.readFileSync(file, 'utf8'), { xmlMode: true });
    $('url').each((_, node) => {
      const loc = $(node).find('loc').first().text().trim();
      if (!loc) return;
      urls.add(loc);
      lastmod.set(loc, $(node).find('lastmod').first().text().trim());
    });
  }
  return { urls, lastmod, files };
}

export function getUrlset(fileName = 'sitemap.xml', distDir = path.resolve('dist')) {
  const config = loadSiteConfig();
  const baseDir = normalizeBasePath(config.site.base).replace(/^\//, '');
  const candidates = [path.join(distDir, fileName), path.join(distDir, baseDir, fileName)];
  const file = candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
  const urls = new Set();
  const lastmod = new Map();
  if (!fs.existsSync(file)) return { urls, lastmod, file, exists: false };
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'), { xmlMode: true });
  $('url').each((_, node) => {
    const loc = $(node).find('loc').first().text().trim();
    if (!loc) return;
    urls.add(loc);
    lastmod.set(loc, $(node).find('lastmod').first().text().trim());
  });
  return { urls, lastmod, file, exists: true };
}
