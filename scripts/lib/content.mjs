import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { load as loadYaml } from 'js-yaml';
import { stripSiteBase, withSiteBase } from './site-url.mjs';

export const CONTENT_TYPES = ['guides', 'comparisons', 'problems', 'faq', 'concepts', 'news'];
export const SITE_ID = process.env.SITE_ID || 'chatgpt-codex-cn';

function mergeDeep(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeDeep(base[key] || {}, value)
      : value;
  }
  return result;
}

function normalizeBaseConfig(value = '/') {
  const normalized = `/${String(value || '').replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized;
}

function normalizeProjectRootPath(value = '/') {
  const base = normalizeBaseConfig(value);
  return base === '/' ? '/' : `${base}/`;
}

function normalizeSiteAliases(config) {
  const site = config.site || {};
  site.url ||= site.baseUrl;
  site.baseUrl ||= site.url;
  site.base ||= site.basePath;
  site.basePath ||= site.base;
  site.base = normalizeBaseConfig(site.base);
  site.basePath = normalizeBaseConfig(site.basePath);
  site.publicUrl ||= new URL(normalizeProjectRootPath(site.base), `${site.baseUrl}/`).toString();
  site.brand ||= config.organization?.name || site.shortName || site.name;
  site.status ||= 'draft';
  site.publishMethod ||= 'static-subdirectory';
  config.site = site;
  return config;
}

export function loadSiteConfig(siteId = SITE_ID) {
  const defaultPath = path.resolve('sites/default.yaml');
  const selectedPath = path.resolve(`sites/${siteId}.yaml`);
  if (!fs.existsSync(selectedPath)) throw new Error(`Site configuration not found: sites/${siteId}.yaml`);
  const base = loadYaml(fs.readFileSync(defaultPath, 'utf8'));
  const selected = loadYaml(fs.readFileSync(selectedPath, 'utf8'));
  return normalizeSiteAliases(mergeDeep(base, selected));
}

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactText(value = '') {
  return normalizeText(value).replace(/\s+/g, '');
}

export function makeShingles(value, size = 3) {
  const text = compactText(value);
  const output = new Set();
  if (text.length <= size) {
    if (text) output.add(text);
    return output;
  }
  for (let index = 0; index <= text.length - size; index += 1) output.add(text.slice(index, index + size));
  return output;
}

export function jaccard(left, right) {
  if (!left.size && !right.size) return 1;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection || 1);
}

export function similarity(left, right, size = 3) {
  return jaccard(makeShingles(left, size), makeShingles(right, size));
}

export function readContent({ includeDrafts = true, siteId = SITE_ID } = {}) {
  const root = path.resolve(`src/content/sites/${siteId}`);
  const config = loadSiteConfig(siteId);
  if (!fs.existsSync(root)) throw new Error(`Content directory not found: ${root}`);
  return fg.sync(`${root.replace(/\\/g, '/')}/**/*.{md,mdx}`)
    .map((file) => {
      const parsed = matter.read(file);
      const relative = path.relative(root, file);
      const collection = relative.split(path.sep)[0];
      const slug = parsed.data.slug || path.basename(file, path.extname(file));
      return {
        file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
        absoluteFile: file,
        collection,
        slug,
        key: `${collection}/${slug}`,
        url: withSiteBase(`/${collection}/${slug}/`, config),
        data: parsed.data,
        body: parsed.content.trim(),
        plain: normalizeText(parsed.content),
        internalLinks: extractMarkdownLinks(parsed.content).map((link) => withSiteBase(link, config)),
      };
    })
    .filter((entry) => includeDrafts || !entry.data.draft)
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function extractMarkdownLinks(body) {
  const links = [];
  for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].trim().split(/[?#]/)[0];
    if (target.startsWith('/')) links.push(target.endsWith('/') || path.extname(target) ? target : `${target}/`);
  }
  return [...new Set(links)];
}

function overlap(left = [], right = []) {
  const rightSet = new Set(right.map((item) => String(item).toLowerCase()));
  return left.filter((item) => rightSet.has(String(item).toLowerCase())).length;
}

export function relatedScore(current, candidate) {
  if (current.key === candidate.key) return -1;
  const manual = new Set(current.data.related || []);
  let score = 0;
  if (manual.has(candidate.slug) || manual.has(candidate.key)) score += 20;
  if (current.data.parent && current.data.parent === candidate.slug) score += 12;
  if (candidate.data.parent && candidate.data.parent === current.slug) score += 12;
  if (current.data.parent && candidate.data.parent === current.data.parent) score += 6;
  if (current.data.pillar && candidate.data.parent === current.slug) score += 10;
  if (candidate.data.pillar && current.data.parent === candidate.slug) score += 10;
  score += overlap(current.data.entity, candidate.data.entity) * 5;
  score += overlap(current.data.keywords, candidate.data.keywords) * 2;
  score += overlap(current.data.tags, candidate.data.tags);
  if (current.data.category === candidate.data.category) score += 2;
  return score;
}

export function findReference(entries, reference) {
  const normalized = stripSiteBase(String(reference), loadSiteConfig()).replace(/^\/+|\/+$/g, '');
  return entries.find((entry) => entry.key === normalized || entry.slug === normalized || entry.url.replace(/^\/+|\/+$/g, '') === normalized);
}
