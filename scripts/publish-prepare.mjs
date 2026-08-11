import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const stages = [
  ['workflow audit', ['run', 'workflow:audit']],
  ['keyword clustering', ['run', 'keyword:cluster']],
  ['build', ['run', 'build']],
  ['SEO check', ['run', 'seo:check']],
  ['content audit', ['run', 'content:audit']],
  ['duplicate check', ['run', 'content:duplicate']],
  ['link check', ['run', 'link:check']],
  ['search audit', ['run', 'search:audit']],
  ['GEO audit', ['run', 'geo:audit']],
  ['Sitemap validation', ['run', 'sitemap:check']],
  ['submission URL generation', ['run', 'submit:all', '--', '--prepare-only']],
  ['production boundary check', ['run', 'production:check']],
];
const failures = [];

for (const [label, args] of stages) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(npm, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) {
    failures.push({ label, status: result.status, error: result.error?.message || '' });
    break;
  }
}

const reportFile = path.resolve('reports/search-engine-report.json');
if (fs.existsSync(reportFile)) {
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  console.log('\nSEARCH ENGINE READINESS');
  for (const engine of report.engines || []) console.log(`${engine.engine}: ${engine.status}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAILED: ${failure.label}${failure.error ? ` - ${failure.error}` : ''}`);
  process.exitCode = 1;
} else {
  console.log('\nPUBLISH PREPARE: READY');
  console.log('All build and audit gates passed. Submission URL files were generated without network requests.');
}
