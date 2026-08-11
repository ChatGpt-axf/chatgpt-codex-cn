import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const sitesDir = path.resolve('sites');
const siteIds = fs.readdirSync(sitesDir)
  .filter((file) => /\.(yaml|yml)$/i.test(file))
  .map((file) => path.basename(file, path.extname(file)))
  .filter((siteId) => siteId !== 'default')
  .sort();

if (siteIds.length === 0) {
  console.error('No sites found in sites/*.yaml.');
  process.exit(1);
}

fs.mkdirSync(path.resolve('dist', 'sites'), { recursive: true });
const results = [];

for (const siteId of siteIds) {
  console.log(`\n=== Building site: ${siteId} ===`);
  const result = spawnSync(npm, ['run', 'build'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      SITE_ID: siteId,
      SITE_DIST_ROOT: path.resolve('dist', 'sites'),
    },
  });
  results.push({ siteId, status: result.status ?? 1, output: `dist/sites/${siteId}` });
  if (result.error || result.status !== 0) break;
}

console.log('\nMULTI SITE BUILD SUMMARY');
for (const item of results) console.log(`${item.siteId}: ${item.status === 0 ? 'PASS' : 'FAIL'} -> ${item.output}`);
if (results.some((item) => item.status !== 0)) process.exitCode = 1;

