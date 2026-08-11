import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { contentPath, getPublishedContent } from '../utils/content';
import { absoluteSiteUrl } from '../utils/url';

export const prerender = true;

export const GET: APIRoute = async () => {
  const entries = await getPublishedContent();
  const important = entries.filter((entry) => entry.data.pillar || entry.data.featured).slice(0, 12);
  const lines = [
    `# ${siteConfig.site.name}`,
    '',
    `> ${siteConfig.site.description}`,
    '',
    '## Core sections',
    ...siteConfig.navigation.header.map((item) => `- [${item.label}](${absoluteSiteUrl(item.url)})`),
    '',
    '## Important pages',
    ...important.map((entry) => `- [${entry.data.title}](${absoluteSiteUrl(contentPath(entry))}): ${entry.data.description}`),
    '',
    '## Content notes',
    '- Pages show authors, published dates, updated dates, and sources when available.',
    '- Use cited primary sources for facts that may change over time.',
    '- This file is a discovery aid; the canonical HTML pages remain authoritative.',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
