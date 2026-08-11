import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { assertSafeId, parseArgs } from './lib/args.mjs';

const args = parseArgs();
const siteId = assertSafeId(String(args.id || process.env.SITE_ID || 'chatgpt-codex-cn'), 'Site id');
if (!fs.existsSync(path.resolve(`sites/${siteId}.yaml`))) throw new Error(`Site configuration not found: sites/${siteId}.yaml`);

const require = createRequire(import.meta.url);
const astroPackagePath = require.resolve('astro/package.json');
const astroPackage = JSON.parse(fs.readFileSync(astroPackagePath, 'utf8'));
const astroCli = path.resolve(path.dirname(astroPackagePath), astroPackage.bin.astro);
const result = spawnSync(process.execPath, [astroCli, 'build'], {
  cwd: process.cwd(),
  env: { ...process.env, SITE_ID: siteId },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
