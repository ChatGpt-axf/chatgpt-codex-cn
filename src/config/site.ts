import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { load as loadYaml } from 'js-yaml';
import { z } from 'astro/zod';

const linkSchema = z.object({ label: z.string().min(1), url: z.string().min(1) });
const verificationSchema = z.object({
  method: z.enum(['none', 'meta', 'html', 'dns']),
  metaName: z.string(),
  value: z.string(),
  fileName: z.string(),
  fileContent: z.string(),
  dnsRecord: z.string(),
});
const searchEngineSchema = z.object({
  enabled: z.boolean(),
  verificationCode: z.string(),
  verification: verificationSchema,
});

const siteConfigSchema = z.object({
  site: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    shortName: z.string().min(1),
    domain: z.string().min(1),
    baseUrl: z.url(),
    basePath: z.string().regex(/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/),
    publicUrl: z.url(),
    brand: z.string().min(1),
    conversionUrl: z.url(),
    status: z.enum(['setup', 'active', 'draft', 'paused', 'legacy_test', 'archived']),
    publishMethod: z.string().min(1),
    adminUrl: z.url().optional(),
    url: z.url(),
    base: z.string().regex(/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/),
    language: z.string().min(2),
    locale: z.string().min(2),
    description: z.string().min(1),
    logo: z.string().min(1),
    favicon: z.string().min(1),
  }),
  brand: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    backgroundColor: z.string(),
    textColor: z.string(),
    mutedColor: z.string(),
    borderColor: z.string(),
  }),
  organization: z.object({
    name: z.string(),
    legalName: z.string(),
    description: z.string(),
    logo: z.string(),
    email: z.email(),
  }),
  seo: z.object({
    defaultTitle: z.string(),
    titleTemplate: z.string().includes('%s'),
    defaultDescription: z.string(),
    defaultOgImage: z.string(),
    twitterCard: z.enum(['summary', 'summary_large_image']),
    canonical: z.string(),
    indexNowEnabled: z.boolean(),
    siteUpdated: z.coerce.date(),
    aiCrawlerPolicy: z.enum(['allow', 'disallow', 'custom']),
    aiCrawlerCustomRules: z.array(z.string()).optional(),
  }),
  navigation: z.object({
    header: z.array(linkSchema),
    footer: z.array(linkSchema),
  }),
  content: z.object({
    author: z.string(),
    publisher: z.string(),
    defaultConversionLevel: z.enum(['none', 'soft', 'normal']),
    showLastUpdated: z.boolean(),
    showSources: z.boolean(),
    showRelatedArticles: z.boolean(),
    relatedArticleCount: z.number().int().min(1).max(12),
  }),
  features: z.object({
    rss: z.boolean(),
    sitemap: z.boolean(),
    search: z.boolean(),
    breadcrumbs: z.boolean(),
    tableOfContents: z.boolean(),
    relatedContent: z.boolean(),
  }),
  analytics: z.object({
    enabled: z.boolean(),
    provider: z.string(),
    id: z.string(),
  }),
  searchEngines: z.object({
    google: searchEngineSchema,
    bing: searchEngineSchema.extend({ indexNow: z.boolean() }),
    baidu: searchEngineSchema,
    so360: searchEngineSchema,
    sogou: searchEngineSchema,
    shenma: searchEngineSchema,
    ai: searchEngineSchema.extend({ openAiSearchBot: z.boolean() }),
  }),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;

function readYaml(filePath: string): Record<string, unknown> {
  return loadYaml(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function mergeDeep(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeDeep((base[key] as Record<string, any>) ?? {}, value as Record<string, any>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const activeSiteId = process.env.SITE_ID || 'default';

function normalizeBaseConfig(value: string): string {
  const normalized = `/${String(value || '').replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized;
}

function normalizeProjectRootPath(value: string): string {
  const base = normalizeBaseConfig(value);
  return base === '/' ? '/' : `${base}/`;
}

function normalizeSiteAliases(config: Record<string, any>): Record<string, any> {
  const site = (config.site ??= {});
  site.url ??= site.baseUrl;
  site.baseUrl ??= site.url;
  site.base ??= site.basePath;
  site.basePath ??= site.base;
  site.base = normalizeBaseConfig(site.base);
  site.basePath = normalizeBaseConfig(site.basePath);
  site.publicUrl ??= new URL(normalizeProjectRootPath(site.base), `${site.baseUrl}/`).toString();
  site.brand ??= config.organization?.name ?? site.shortName ?? site.name;
  site.conversionUrl ??= '';
  site.status ??= 'draft';
  site.publishMethod ??= 'static-subdirectory';
  return config;
}

export function loadSiteConfig(siteId = activeSiteId): SiteConfig {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(siteId)) {
    throw new Error(`Invalid SITE_ID: ${siteId}`);
  }
  const defaultPath = path.resolve('sites/default.yaml');
  const selectedPath = path.resolve(`sites/${siteId}.yaml`);
  if (!fs.existsSync(selectedPath)) {
    throw new Error(`Site configuration not found: sites/${siteId}.yaml`);
  }
  return siteConfigSchema.parse(normalizeSiteAliases(mergeDeep(readYaml(defaultPath), readYaml(selectedPath))));
}

export const siteConfig = loadSiteConfig();

export function siteAllowsIndexing(config = siteConfig): boolean {
  return config.site.status === 'active';
}

export function getVerificationPaths(): Set<string> {
  const paths = new Set<string>();
  for (const engine of Object.values(siteConfig.searchEngines)) {
    const verification = engine.verification;
    if (engine.enabled && verification.method === 'html' && verification.fileName) {
      paths.add(`/${verification.fileName}`);
    }
  }
  return paths;
}

export function getNoindexPaths(): Set<string> {
  const root = `src/content/sites/${activeSiteId}`;
  const paths = new Set<string>(['/contact/', '/editorial-policy/', '/terms/']);
  const publishedCollections = new Set<string>();
  for (const file of fg.sync(`${root}/**/*.{md,mdx}`)) {
    const data = matter.read(file).data;
    const collection = path.basename(path.dirname(file));
    if (data.noindex || data.draft) {
      paths.add(`/${collection}/${data.slug}/`);
    } else {
      publishedCollections.add(collection);
    }
  }
  for (const collection of ['guides', 'comparisons', 'problems', 'faq', 'concepts', 'news']) {
    if (!publishedCollections.has(collection)) paths.add(`/${collection}/`);
  }
  return paths;
}

export function getSitemapMetadata(): Map<string, { lastmod?: string }> {
  if (!siteAllowsIndexing()) return new Map();
  const root = `src/content/sites/${activeSiteId}`;
  const metadata = new Map<string, { lastmod?: string }>();
  for (const file of fg.sync(`${root}/**/*.{md,mdx}`)) {
    const data = matter.read(file).data;
    if (data.draft || data.noindex || !data.slug) continue;
    const collection = path.basename(path.dirname(file));
    const lastmod = data.updated || data.date;
    metadata.set(`/${collection}/${data.slug}/`, {
      lastmod: lastmod ? new Date(lastmod).toISOString() : undefined,
    });
  }
  return metadata;
}
