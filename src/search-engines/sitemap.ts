import { siteAllowsIndexing, siteConfig } from '../config/site';
import { getEntities } from '../utils/entities';
import {
  CONTENT_COLLECTIONS,
  contentPath,
  getPublishedContent,
  toUrlSegment,
} from '../utils/content';
import { absoluteSiteUrl } from '../utils/url';

export interface SitemapEntry {
  loc: string;
  lastmod: string;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function getCanonicalSitemapEntries(): Promise<SitemapEntry[]> {
  if (!siteAllowsIndexing()) return [];
  const content = (await getPublishedContent()).filter((entry) => !entry.data.noindex);
  const siteUpdated = siteConfig.seo.siteUpdated.toISOString();
  const latest = (items: typeof content) => items.length > 0
    ? new Date(Math.max(...items.map((entry) => entry.data.updated.getTime()))).toISOString()
    : siteUpdated;
  const entries = new Map<string, string>();
  const add = (pathname: string, lastmod = siteUpdated) => {
    const loc = absoluteSiteUrl(pathname);
    const current = entries.get(loc);
    if (!current || new Date(lastmod) > new Date(current)) entries.set(loc, lastmod);
  };

  for (const path of ['/']) add(path);
  for (const collection of CONTENT_COLLECTIONS) {
    const collectionEntries = content.filter((entry) => entry.collection === collection);
    if (collectionEntries.length > 0) add(`/${collection}/`, latest(collectionEntries));
  }
  for (const entry of content) add(contentPath(entry), entry.data.updated.toISOString());

  const categories = new Set(content.map((entry) => entry.data.category));
  for (const category of categories) {
    add(`/categories/${toUrlSegment(category)}/`, latest(content.filter((entry) => entry.data.category === category)));
  }
  const tags = new Set(content.flatMap((entry) => entry.data.tags));
  for (const tag of tags) {
    add(`/tags/${toUrlSegment(tag)}/`, latest(content.filter((entry) => entry.data.tags.includes(tag))));
  }
  for (const entity of getEntities()) {
    add(`/entities/${entity.id}/`, latest(content.filter((entry) => entry.data.entity.includes(entity.id))));
  }

  return [...entries].map(([loc, lastmod]) => ({ loc, lastmod })).sort((a, b) => a.loc.localeCompare(b.loc));
}

export function renderXmlSitemap(entries: SitemapEntry[]): string {
  const rows = entries.map((entry) => `  <url><loc>${escapeXml(entry.loc)}</loc><lastmod>${escapeXml(entry.lastmod)}</lastmod></url>`);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...rows, '</urlset>', ''].join('\n');
}

export function renderTextSitemap(entries: SitemapEntry[]): string {
  return `${entries.map((entry) => entry.loc).join('\n')}\n`;
}
