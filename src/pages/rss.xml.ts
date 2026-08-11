import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { contentPath, getPublishedContent } from '../utils/content';
import { projectRootUrl } from '../utils/url';

export const prerender = true;

export const GET: APIRoute = async () => {
  if (!siteConfig.features.rss) return new Response('RSS is disabled.', { status: 404 });
  const entries = (await getPublishedContent()).slice(0, 50);
  return rss({
    title: siteConfig.site.name,
    description: siteConfig.site.description,
    site: projectRootUrl,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.updated,
      link: contentPath(entry),
      categories: entry.data.tags,
    })),
    customData: `<language>${siteConfig.site.language}</language>`,
  });
};
