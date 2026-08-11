import type { SearchEngineDefinition } from './types';

export const baidu: SearchEngineDefinition = {
  id: 'baidu',
  name: '百度搜索',
  crawler: 'Baiduspider',
  supportsSitemap: true,
  supportsIndexNow: false,
  supportsPushApi: true,
  supportsManualSubmission: true,
  requiresVerification: true,
  submission: 'api-if-entitled',
  sitemapPath: '/sitemap.xml',
  webmasterUrl: 'https://ziyuan.baidu.com/',
  notes: 'Use the direct URL-set Sitemap. API submission requires an eligible verified site and token.',
};
