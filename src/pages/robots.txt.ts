import type { APIRoute } from 'astro';
import { siteAllowsIndexing, siteConfig } from '../config/site';
import { searchEngineAdapters } from '../search-engines/registry';
import { absoluteSiteUrl, projectRootPath, withBasePath } from '../utils/url';

export const prerender = true;

const restrictedPaths = ['/admin/', '/api/', '/drafts/', '/search/', '/*?*'].map(withBasePath);
const traditionalEngineIds = ['google', 'bing', 'baidu', 'so360', 'sogou', 'shenma'] as const;

function crawlerBlock(crawler: string, enabled: boolean): string[] {
  if (!enabled) return [`User-agent: ${crawler}`, `Disallow: ${projectRootPath}`, ''];
  return [
    `User-agent: ${crawler}`,
    `Allow: ${projectRootPath}`,
    ...restrictedPaths.map((path) => `Disallow: ${path}`),
    '',
  ];
}

export const GET: APIRoute = () => {
  const rootRobotsUrl = `${new URL(siteConfig.site.url).origin}/robots.txt`;
  const rootDeployment = projectRootPath === '/';
  if (!siteAllowsIndexing()) {
    const lines = [
      `# ${siteConfig.site.status} site: search indexing is disabled until the site is active.`,
      ...(rootDeployment ? [] : [`# Advisory only: the authoritative robots.txt is ${rootRobotsUrl}`]),
      '',
      'User-agent: *',
      `Disallow: ${projectRootPath}`,
      '',
    ];
    return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const lines = [
    ...(rootDeployment
      ? [`# robots.txt for ${siteConfig.site.publicUrl}`]
      : [
          `# Advisory only: the authoritative robots.txt is ${rootRobotsUrl}`,
          '# Review and merge these rules into the existing root robots.txt; do not overwrite it.',
        ]),
    '',
    'User-agent: *',
    `Allow: ${projectRootPath}`,
    ...restrictedPaths.map((path) => `Disallow: ${path}`),
    '',
  ];

  for (const id of traditionalEngineIds) {
    const adapter = searchEngineAdapters[id];
    lines.push(...crawlerBlock(adapter.crawler, adapter.enabled));
  }

  const searchBotEnabled = searchEngineAdapters.ai.enabled && siteConfig.searchEngines.ai.openAiSearchBot;
  lines.push(...crawlerBlock(searchEngineAdapters.ai.crawler, searchBotEnabled));

  if (siteConfig.seo.aiCrawlerPolicy === 'disallow') {
    for (const crawler of ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'ClaudeBot', 'PerplexityBot', 'CCBot']) {
      lines.push(`User-agent: ${crawler}`, 'Disallow: /', '');
    }
  } else if (siteConfig.seo.aiCrawlerPolicy === 'custom') {
    lines.push(...(siteConfig.seo.aiCrawlerCustomRules || []), '');
  }

  if (siteConfig.features.sitemap) {
    lines.push(`Sitemap: ${absoluteSiteUrl('/sitemap.xml')}`);
    lines.push(`Sitemap: ${absoluteSiteUrl('/sitemap-index.xml')}`);
    if (siteConfig.searchEngines.sogou.enabled) lines.push(`Sitemap: ${absoluteSiteUrl('/sitemap-sogou.xml')}`);
  }
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
