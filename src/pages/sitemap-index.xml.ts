import type { APIRoute } from 'astro';
import { absoluteSiteUrl } from '../utils/url';

export const prerender = true;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = () => new Response([
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  `  <sitemap><loc>${escapeXml(absoluteSiteUrl('/sitemap.xml'))}</loc></sitemap>`,
  '</sitemapindex>',
  '',
].join('\n'), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
