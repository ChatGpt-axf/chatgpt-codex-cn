import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { parseArgs } from './lib/args.mjs';
import { loadSiteConfig } from './lib/content.mjs';
import { withSiteBase } from './lib/site-url.mjs';

const args = parseArgs();
const config = loadSiteConfig();
const baseUrl = String(args.url || 'http://127.0.0.1:4321');
const candidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome/Edge not found. Set CHROME_PATH to a Chromium executable.');

const outputDir = path.resolve('reports/visual');
fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const consoleErrors = [];
const failures = [];
const cases = [
  { name: 'home-desktop', path: withSiteBase('/', config), viewport: { width: 1440, height: 1000 } },
  { name: 'home-mobile', path: withSiteBase('/', config), viewport: { width: 390, height: 844 } },
  { name: 'article-desktop', path: withSiteBase('/guides/chatgpt-plus-guide/', config), viewport: { width: 1440, height: 1000 } },
  { name: 'article-mobile', path: withSiteBase('/guides/chatgpt-plus-guide/', config), viewport: { width: 390, height: 844 } },
];

try {
  for (const item of cases) {
    const context = await browser.newContext({ viewport: item.viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`${item.name}: ${message.text()}`);
    });
    page.on('pageerror', (error) => consoleErrors.push(`${item.name}: ${error.message}`));
    const response = await page.goto(new URL(item.path, baseUrl).toString(), { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${item.name}: HTTP ${response?.status() || 'no response'}`);
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      h1Count: document.querySelectorAll('h1').length,
      imageFailures: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
    }));
    if (metrics.scrollWidth > metrics.clientWidth + 1) failures.push(`${item.name}: horizontal overflow ${metrics.scrollWidth}px > ${metrics.clientWidth}px`);
    if (metrics.h1Count !== 1) failures.push(`${item.name}: expected one H1, found ${metrics.h1Count}`);
    if (metrics.imageFailures.length > 0) failures.push(`${item.name}: failed images ${metrics.imageFailures.join(', ')}`);
    const screenshot = path.join(outputDir, `${item.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    console.log(`PASS ${item.name} ${item.viewport.width}x${item.viewport.height} -> ${path.relative(process.cwd(), screenshot)}`);
    await context.close();
  }
} finally {
  await browser.close();
}

for (const error of consoleErrors) console.warn(`CONSOLE ${error}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`ERROR ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Visual check passed: ${cases.length} viewports, no horizontal overflow or failed images.`);
}
