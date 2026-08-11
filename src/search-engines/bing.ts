import type { SearchEngineDefinition } from './types';

export const bing: SearchEngineDefinition = {
  id: 'bing',
  name: 'Bing',
  crawler: 'Bingbot',
  supportsSitemap: true,
  supportsIndexNow: true,
  supportsPushApi: false,
  supportsManualSubmission: true,
  requiresVerification: true,
  submission: 'indexnow',
  sitemapPath: '/sitemap-index.xml',
  webmasterUrl: 'https://www.bing.com/webmasters/',
  notes: 'Use Sitemap plus IndexNow for added, updated, and deleted URLs.',
};
