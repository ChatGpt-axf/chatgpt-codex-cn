import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { loadSiteConfig } from './lib/content.mjs';
import { absoluteSiteUrl } from './lib/site-url.mjs';

const config = loadSiteConfig();
const requiredColumns = ['keyword', 'primary_keyword', 'cluster', 'intent', 'priority', 'target_url', 'status'];

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function readKeywordRows() {
  const files = fg.sync('data/keywords/*.csv', { onlyFiles: true });
  const rows = [];
  const errors = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) continue;
    const headers = parseCsvLine(lines[0]);
    for (const column of requiredColumns) {
      if (!headers.includes(column)) errors.push({ file, code: 'missing-column', message: `Missing column: ${column}` });
    }
    for (const [offset, line] of lines.slice(1).entries()) {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
      row.file = file;
      row.line = offset + 2;
      rows.push(row);
    }
  }
  return { rows, errors };
}

function clusterKey(row) {
  return [
    row.cluster || 'unclustered',
    row.intent || 'unknown',
    row.target_url || row.primary_keyword || row.keyword,
  ].join('|');
}

function decideAction(group) {
  const targetUrl = group.rows.find((row) => row.target_url)?.target_url || '';
  const statuses = new Set(group.rows.map((row) => row.status));
  if (targetUrl && group.rows.length > 1) return statuses.has('merged') ? 'merge-intent' : 'update-existing-page';
  if (targetUrl) return 'mapped-existing-page';
  return 'create-content-plan';
}

const { rows, errors } = readKeywordRows();
const groups = new Map();
for (const row of rows) {
  if (!row.keyword) errors.push({ file: row.file, line: row.line, code: 'missing-keyword', message: 'Keyword is empty.' });
  if (!row.cluster) errors.push({ file: row.file, line: row.line, code: 'missing-cluster', message: `Keyword "${row.keyword}" has no cluster.` });
  if (!row.intent) errors.push({ file: row.file, line: row.line, code: 'missing-intent', message: `Keyword "${row.keyword}" has no search intent.` });
  if (row.target_url && !row.target_url.startsWith('/')) {
    errors.push({ file: row.file, line: row.line, code: 'invalid-target-url', message: `Target URL must be root-relative: ${row.target_url}` });
  }
  const key = clusterKey(row);
  const group = groups.get(key) || {
    id: key.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gu, '-').replace(/^-|-$/g, ''),
    cluster: row.cluster || 'unclustered',
    intent: row.intent || 'unknown',
    primaryKeyword: row.primary_keyword || row.keyword,
    targetUrl: row.target_url || '',
    rows: [],
  };
  group.rows.push(row);
  groups.set(key, group);
}

const clusters = [...groups.values()]
  .map((group) => ({
    id: group.id,
    cluster: group.cluster,
    intent: group.intent,
    primaryKeyword: group.primaryKeyword,
    targetUrl: group.targetUrl,
    publicUrl: group.targetUrl ? absoluteSiteUrl(group.targetUrl, config) : '',
    action: decideAction(group),
    keywords: group.rows.map((row) => row.keyword),
    priority: group.rows.some((row) => row.priority === 'high') ? 'high' : group.rows[0]?.priority || 'medium',
    statuses: [...new Set(group.rows.map((row) => row.status).filter(Boolean))],
  }))
  .sort((left, right) => left.cluster.localeCompare(right.cluster) || left.intent.localeCompare(right.intent));

const report = {
  generatedAt: new Date().toISOString(),
  site: config.site.publicUrl,
  status: errors.length > 0 ? 'FAIL' : 'PASS',
  totals: { keywords: rows.length, clusters: clusters.length, errors: errors.length },
  errors,
  clusters,
};

fs.mkdirSync(path.resolve('reports'), { recursive: true });
fs.writeFileSync(path.resolve('reports/keyword-clusters.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.resolve('reports/keyword-clusters.md'), [
  '# Keyword Cluster Report',
  '',
  `- Status: ${report.status}`,
  `- Site: ${report.site}`,
  `- Keywords: ${rows.length}`,
  `- Clusters: ${clusters.length}`,
  `- Errors: ${errors.length}`,
  '',
  '| Cluster | Intent | Primary keyword | Keywords | Action | Target |',
  '| --- | --- | --- | ---: | --- | --- |',
  ...clusters.map((item) => `| ${item.cluster} | ${item.intent} | ${item.primaryKeyword} | ${item.keywords.length} | ${item.action} | ${item.publicUrl || '待建 Content Plan'} |`),
  '',
  ...errors.map((item) => `- ERROR [${item.code}] ${item.message}${item.file ? ` (${item.file}${item.line ? `:${item.line}` : ''})` : ''}`),
  '',
].join('\n'));

for (const item of errors) console.error(`ERROR [${item.code}] ${item.message}${item.file ? ` (${item.file}${item.line ? `:${item.line}` : ''})` : ''}`);
console.log('\nKeyword Cluster Summary');
console.log(`Status: ${report.status}`);
console.log(`Keywords: ${rows.length}`);
console.log(`Clusters: ${clusters.length}`);
console.log(`Report: reports/keyword-clusters.md`);
if (errors.length > 0) process.exitCode = 1;
