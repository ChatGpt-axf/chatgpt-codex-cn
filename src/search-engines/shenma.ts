import type { SearchEngineDefinition } from './types';

export const shenma: SearchEngineDefinition = {
  id: 'shenma',
  name: '神马搜索',
  crawler: 'YisouSpider',
  supportsSitemap: true,
  supportsIndexNow: false,
  supportsPushApi: false,
  supportsManualSubmission: true,
  requiresVerification: true,
  submission: 'manual',
  sitemapPath: '/sitemap.xml',
  webmasterUrl: 'https://zhanzhang.sm.cn/',
  notes: 'Use Sitemap and the Shenma Webmaster Platform with mobile-first readiness checks.',
};
