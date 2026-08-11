import type { SearchEngineDefinition } from './types';

export const google: SearchEngineDefinition = {
  id: 'google',
  name: 'Google',
  crawler: 'Googlebot',
  supportsSitemap: true,
  supportsIndexNow: false,
  supportsPushApi: false,
  supportsManualSubmission: true,
  requiresVerification: true,
  submission: 'manual',
  sitemapPath: '/sitemap-index.xml',
  webmasterUrl: 'https://search.google.com/search-console/',
  notes: 'Use Search Console and Sitemap. Do not use IndexNow or the limited Indexing API for ordinary pages.',
};
