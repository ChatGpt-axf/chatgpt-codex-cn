import fs from 'node:fs';
import path from 'node:path';
import { getProjectRootPath, getProjectRootUrl, withSiteBase } from './site-url.mjs';

const CRAWLERS = [
  ['google', 'Googlebot'],
  ['bing', 'Bingbot'],
  ['baidu', 'Baiduspider'],
  ['so360', '360Spider'],
  ['sogou', 'Sogou web spider'],
  ['shenma', 'YisouSpider'],
  ['ai', 'OAI-SearchBot'],
];

export function rootRobotsRecommendation(config) {
  const projectRoot = getProjectRootPath(config);
  const rootRobotsUrl = `${new URL(getProjectRootUrl(config)).origin}/robots.txt`;
  const restricted = ['/admin/', '/api/', '/drafts/', '/search/', '/*?*'].map((item) => withSiteBase(item, config));
  const lines = [
    `# REVIEW BEFORE MERGING INTO ${rootRobotsUrl}`,
    '# This is an additive recommendation. Do not overwrite the existing main-site file.',
    '',
    'User-agent: *',
    `Allow: ${projectRoot}`,
    ...restricted.map((item) => `Disallow: ${item}`),
    '',
  ];
  for (const [id, crawler] of CRAWLERS) {
    const setting = config.searchEngines[id];
    const enabled = id === 'ai' ? setting.enabled && setting.openAiSearchBot : setting.enabled;
    lines.push(`User-agent: ${crawler}`, enabled ? `Allow: ${projectRoot}` : `Disallow: ${projectRoot}`, '');
  }
  lines.push(`Sitemap: ${getProjectRootUrl(config)}sitemap.xml`);
  lines.push(`Sitemap: ${getProjectRootUrl(config)}sitemap-index.xml`);
  if (config.searchEngines.sogou.enabled) lines.push(`Sitemap: ${getProjectRootUrl(config)}sitemap-sogou.xml`);
  return `${lines.join('\n')}\n`;
}

export function writeProductionGuides(config) {
  const reports = path.resolve('reports');
  fs.mkdirSync(reports, { recursive: true });
  const rootUrl = getProjectRootUrl(config);
  const rootPath = getProjectRootPath(config);
  const rootPathLabel = rootPath === '/' ? '/' : rootPath.replace(/\/$/, '');
  const origin = new URL(rootUrl).origin;
  fs.writeFileSync(path.join(reports, 'root-robots-recommended.txt'), rootRobotsRecommendation(config));
  fs.writeFileSync(path.join(reports, 'root-llms-recommended.txt'), [
    '# Optional root llms.txt addition',
    '',
    `- [AI / ChatGPT / Codex 中文内容中心](${rootUrl}): 项目自己的 llms.txt 位于 ${rootUrl}llms.txt。`,
    '',
    'Do not overwrite the existing root llms.txt. Merge only after reviewing the main-site policy.',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(reports, 'google-search-console-guide.md'), [
    '# Google Search Console URL-prefix Setup',
    '',
    `1. Add the URL-prefix property \`${rootUrl}\`.`,
    '2. Choose a verification method issued by Google. Configure the real meta value, HTML file, or DNS record; do not invent one.',
    `3. After deployment, confirm the property can fetch \`${rootUrl}sitemap.xml\`.`,
    `4. Submit \`${rootUrl}sitemap.xml\` (or \`${rootUrl}sitemap-index.xml\`).`,
    `5. Inspect representative URLs only after they return 200 and their canonical includes \`${rootPath}\`.`,
    '',
    'Verification and Sitemap submission do not guarantee indexing or ranking.',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(reports, 'indexnow-deployment-guide.md'), [
    '# IndexNow Subdirectory Deployment',
    '',
    `- Host sent to IndexNow: \`${new URL(rootUrl).host}\``,
    `- Allowed submitted URL prefix: \`${rootUrl}\``,
    `- Default key location: \`${rootUrl}<INDEXNOW_KEY>.txt\``,
    '- Build with `INDEXNOW_KEY` set. Astro emits `<INDEXNOW_KEY>.txt` in `dist/`.',
    `- Upload that file with the rest of \`dist/\` into the server directory that serves \`${rootPath}\`.`,
    `- Keep \`INDEXNOW_KEY_LOCATION\` empty to use the configured site location, or set it to the exact \`${rootPathLabel}\` URL.`,
    `- Do not upload or overwrite a key file at \`${origin}/<key>.txt\` from this project.`,
    '',
    `The key location and every submitted URL are constrained to \`${rootPath}\` by the submission script.`,
    '',
  ].join('\n'));
}
