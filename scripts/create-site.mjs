import fs from 'node:fs';
import path from 'node:path';
import { dump, load as loadYaml } from 'js-yaml';
import { assertSafeId, parseArgs } from './lib/args.mjs';
import { CONTENT_TYPES } from './lib/content.mjs';

const args = parseArgs();
const siteId = assertSafeId(String(args.id || ''), 'Site id');
const configPath = path.resolve(`sites/${siteId}.yaml`);
if (fs.existsSync(configPath)) throw new Error(`Site already exists: sites/${siteId}.yaml`);

const config = loadYaml(fs.readFileSync(path.resolve('sites/default.yaml'), 'utf8'));
const displayName = String(args.name || siteId.replace(/(^|-)([a-z0-9])/g, (_, prefix, value) => `${prefix ? ' ' : ''}${value.toUpperCase()}`));
const brand = String(args.brand || displayName);
const domain = String(args.domain || `${siteId}.example`);
const baseUrl = String(args.baseUrl || `https://${domain}`);
const basePath = `/${String(args.basePath || '/').replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '/');
const publicUrl = new URL(basePath === '/' ? '/' : `${basePath.replace(/^\/+|\/+$/g, '')}/`, `${baseUrl}/`).toString();
config.site.id = siteId;
config.site.name = displayName;
config.site.shortName = displayName;
config.site.domain = domain;
config.site.baseUrl = baseUrl;
config.site.basePath = basePath;
config.site.publicUrl = publicUrl;
config.site.brand = brand;
config.site.conversionUrl = String(args.conversionUrl || publicUrl);
config.site.status = String(args.status || 'draft');
config.site.publishMethod = String(args.publishMethod || 'static-subdirectory');
config.site.adminUrl = String(args.adminUrl || `https://seo.${domain}/`);
config.site.url = baseUrl;
config.site.base = basePath;
config.site.logo = '/images/site-logo.svg';
config.organization.name = `${displayName} Editorial Team`;
config.organization.legalName = `${displayName} Editorial Team`;
config.organization.email = `editor@${domain}`;
config.content.publisher = displayName;
config.content.defaultConversionLevel = String(args.conversionLevel || 'soft');
config.seo.defaultTitle = displayName;
config.seo.titleTemplate = `%s | ${displayName}`;

fs.writeFileSync(configPath, dump(config, { noRefs: true, lineWidth: 120 }), { flag: 'wx' });
const contentRoot = path.resolve(`src/content/sites/${siteId}`);
for (const type of CONTENT_TYPES) {
  const directory = path.join(contentRoot, type);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, '.gitkeep'), '', { flag: 'wx' });
}

console.log(`Created sites/${siteId}.yaml`);
console.log(`Created src/content/sites/${siteId}/{${CONTENT_TYPES.join(',')}}`);
console.log(`Review placeholder domain/email values, then run: npm run build:site -- --id=${siteId}`);
