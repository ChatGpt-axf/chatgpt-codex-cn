import type { SearchEngineDefinition } from './types';

export const so360: SearchEngineDefinition = {
  id: 'so360',
  name: '360搜索',
  crawler: '360Spider',
  supportsSitemap: true,
  supportsIndexNow: false,
  supportsPushApi: false,
  supportsManualSubmission: true,
  requiresVerification: true,
  submission: 'manual',
  sitemapPath: '/sitemap.xml',
  webmasterUrl: 'https://zhanzhang.so.com/',
  notes: 'Use Sitemap and 360 Webmaster Platform. No unverified public API is called.',
};
