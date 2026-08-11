import type { SearchEngineDefinition } from './types';

export const sogou: SearchEngineDefinition = {
  id: 'sogou',
  name: '搜狗搜索',
  crawler: 'Sogou web spider',
  supportsSitemap: true,
  supportsIndexNow: false,
  supportsPushApi: false,
  supportsManualSubmission: true,
  requiresVerification: true,
  submission: 'manual',
  sitemapPath: '/sitemap-sogou.xml',
  webmasterUrl: 'https://data.open.sogou.com/',
  notes: 'Use XML/TXT Sitemap and webmaster submission when the account is eligible.',
};
