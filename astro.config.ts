import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import { activeSiteId, getNoindexPaths, getSitemapMetadata, getVerificationPaths, siteAllowsIndexing, siteConfig } from './src/config/site';
import { basePathLinks } from './src/markdown/base-path-links';
import { stripBasePath } from './src/utils/url';

const noindexPaths = getNoindexPaths();
const sitemapMetadata = getSitemapMetadata();
const verificationPaths = getVerificationPaths();
const siteDistRoot = process.env.SITE_DIST_ROOT?.replace(/[\\/]+$/, '');
const outDir = process.env.SITE_OUT_DIR || (siteDistRoot ? `${siteDistRoot}/${activeSiteId}` : 'dist');
const indexingEnabled = siteAllowsIndexing();

export default defineConfig({
  site: siteConfig.site.url,
  base: siteConfig.site.base,
  outDir,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    mdx(),
    siteConfig.features.sitemap && indexingEnabled && sitemap({
      entryLimit: 10000,
      filter(page) {
        const pathname = stripBasePath(new URL(page).pathname);
        return !['/404/', '/search/', '/admin/'].includes(pathname) && !noindexPaths.has(pathname) && !verificationPaths.has(pathname);
      },
      serialize(item) {
        const pathname = stripBasePath(new URL(item.url).pathname);
        const metadata = sitemapMetadata.get(pathname);
        if (metadata?.lastmod) item.lastmod = metadata.lastmod;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: 0,
    },
  },
  markdown: {
    processor: unified({ rehypePlugins: [[basePathLinks, { base: siteConfig.site.base }]] }),
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
