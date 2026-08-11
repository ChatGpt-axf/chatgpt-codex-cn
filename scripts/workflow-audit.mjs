import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { load as loadYaml } from 'js-yaml';
import { readContent, loadSiteConfig } from './lib/content.mjs';
import { getProjectRootUrl, normalizeBasePath } from './lib/site-url.mjs';

const config = loadSiteConfig();
const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const entries = readContent({ includeDrafts: true });
const errors = [];
const warnings = [];
const passes = [];

function pass(label) { passes.push(label); }
function error(code, message, file = '') { errors.push({ code, message, file }); }
function warn(code, message, file = '') { warnings.push({ code, message, file }); }
function hasScript(name) { return Boolean(packageJson.scripts?.[name]); }

const requiredSiteFields = ['name', 'domain', 'baseUrl', 'basePath', 'brand', 'conversionUrl', 'language', 'status', 'publishMethod'];
for (const field of requiredSiteFields) {
  if (!config.site[field]) error('site-model', `Site field is missing: ${field}`, 'sites/*.yaml');
  else pass(`site.${field}`);
}

if (config.site.url !== config.site.baseUrl) error('site-url-alias', 'site.url must match site.baseUrl.', 'sites/*.yaml');
else pass('site.url alias');
if (normalizeBasePath(config.site.base) !== normalizeBasePath(config.site.basePath)) error('site-base-alias', 'site.base must match site.basePath.', 'sites/*.yaml');
else pass('site.base alias');
if (config.site.publicUrl !== getProjectRootUrl(config)) error('site-public-url', `site.publicUrl must be ${getProjectRootUrl(config)}`, 'sites/*.yaml');
else pass('site.publicUrl');
if (new URL(config.site.conversionUrl).origin === new URL(config.site.publicUrl).origin) {
  warn('conversion-origin', 'Conversion URL uses the same origin as the content site; verify this is intentional.', 'sites/*.yaml');
} else pass('conversion boundary');
if (config.site.adminUrl && new URL(config.site.adminUrl).origin === new URL(config.site.publicUrl).origin) {
  warn('admin-origin', 'Admin URL is not separated from the public content origin.', 'sites/*.yaml');
} else pass('admin boundary');

for (const script of ['site:create', 'keyword:cluster', 'content:create', 'ai:draft', 'seo:check', 'geo:audit', 'publish:prepare']) {
  if (!hasScript(script)) error('missing-script', `Missing workflow script: ${script}`, 'package.json');
  else pass(`script ${script}`);
}

const statuses = ['planned', 'draft', 'review', 'approved', 'scheduled', 'published', 'update-needed', 'merged', 'rejected'];
const conversionLevels = ['none', 'soft', 'normal'];
const statusCounts = Object.fromEntries(statuses.map((status) => [status, 0]));
const conversionCounts = Object.fromEntries(conversionLevels.map((level) => [level, 0]));

for (const entry of entries) {
  const status = entry.data.status || 'draft';
  const level = entry.data.conversionLevel || 'soft';
  if (!statuses.includes(status)) error('content-status', `Invalid status: ${status}`, entry.file);
  else statusCounts[status] += 1;
  if (!conversionLevels.includes(level)) error('conversion-level', `Invalid conversionLevel: ${level}`, entry.file);
  else conversionCounts[level] += 1;
  if (entry.data.draft && !entry.data.noindex) error('draft-indexable', 'Draft content must remain noindex.', entry.file);
  else pass(`index gate ${entry.key}`);
  if (['planned', 'draft', 'review', 'rejected'].includes(status) && (!entry.data.draft || !entry.data.noindex)) {
    error('workflow-gate', `${status} content must not be public/indexable.`, entry.file);
  }
  if (status === 'published' && (entry.data.draft || entry.data.noindex)) {
    error('published-gate', 'Published content cannot be draft or noindex.', entry.file);
  }
}

const keywordFiles = fg.sync('data/keywords/*.csv', { onlyFiles: true });
if (keywordFiles.length === 0) error('keyword-library', 'No keyword CSV files found.', 'data/keywords');
else pass('keyword library');

const planFiles = fg.sync('data/content-plans/*.{yaml,yml,json}', { onlyFiles: true });
if (planFiles.length === 0) error('content-plans', 'No content plan files found.', 'data/content-plans');
else pass('content plans');
for (const file of planFiles) {
  const plan = file.endsWith('.json')
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : loadYaml(fs.readFileSync(file, 'utf8'));
  if (!plan?.searchIntent) error('plan-intent', 'Content plan is missing searchIntent.', file);
  else pass(`plan intent ${file}`);
  if (!plan?.status) warn('plan-status', 'Content plan has no status.', file);
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length > 0 ? 'FAIL' : 'PASS',
  site: {
    name: config.site.name,
    publicUrl: config.site.publicUrl,
    conversionUrl: config.site.conversionUrl,
    adminUrl: config.site.adminUrl || '',
    status: config.site.status,
    publishMethod: config.site.publishMethod,
  },
  totals: {
    content: entries.length,
    keywordFiles: keywordFiles.length,
    contentPlans: planFiles.length,
    errors: errors.length,
    warnings: warnings.length,
    passes: passes.length,
  },
  statusCounts,
  conversionCounts,
  errors,
  warnings,
};

fs.mkdirSync(path.resolve('reports'), { recursive: true });
fs.writeFileSync(path.resolve('reports/workflow-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.resolve('reports/workflow-audit.md'), [
  '# Core Workflow Audit',
  '',
  `- Status: ${report.status}`,
  `- Site: ${report.site.publicUrl}`,
  `- Conversion URL: ${report.site.conversionUrl}`,
  `- Admin URL: ${report.site.adminUrl || 'not configured'}`,
  `- Content items: ${entries.length}`,
  `- Keyword files: ${keywordFiles.length}`,
  `- Content plans: ${planFiles.length}`,
  `- Errors: ${errors.length}`,
  `- Warnings: ${warnings.length}`,
  '',
  '## Content Status',
  '',
  ...Object.entries(statusCounts).map(([status, count]) => `- ${status}: ${count}`),
  '',
  '## Conversion Levels',
  '',
  ...Object.entries(conversionCounts).map(([level, count]) => `- ${level}: ${count}`),
  '',
  ...errors.map((item) => `- ERROR [${item.code}] ${item.message}${item.file ? ` (${item.file})` : ''}`),
  ...warnings.map((item) => `- WARNING [${item.code}] ${item.message}${item.file ? ` (${item.file})` : ''}`),
  '',
].join('\n'));

for (const item of errors) console.error(`ERROR [${item.code}] ${item.message}${item.file ? ` (${item.file})` : ''}`);
for (const item of warnings) console.warn(`WARN  [${item.code}] ${item.message}${item.file ? ` (${item.file})` : ''}`);
console.log('\nCore Workflow Audit Summary');
console.log(`Status: ${report.status}`);
console.log(`Content: ${entries.length}`);
console.log(`Keyword files: ${keywordFiles.length}`);
console.log(`Content plans: ${planFiles.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log('Report: reports/workflow-audit.md');
if (errors.length > 0) process.exitCode = 1;
