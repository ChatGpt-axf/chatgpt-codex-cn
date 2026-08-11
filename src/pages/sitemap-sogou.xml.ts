import type { APIRoute } from 'astro';
import { getCanonicalSitemapEntries, renderXmlSitemap } from '../search-engines/sitemap';

export const prerender = true;

export const GET: APIRoute = async () => new Response(
  renderXmlSitemap(await getCanonicalSitemapEntries()),
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
);
