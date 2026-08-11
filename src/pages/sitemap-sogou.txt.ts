import type { APIRoute } from 'astro';
import { getCanonicalSitemapEntries, renderTextSitemap } from '../search-engines/sitemap';

export const prerender = true;

export const GET: APIRoute = async () => new Response(
  renderTextSitemap(await getCanonicalSitemapEntries()),
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
