import type { SearchEngineDefinition } from './types';

export const ai: SearchEngineDefinition = {
  id: 'ai',
  name: 'AI Search / GEO',
  crawler: 'OAI-SearchBot',
  supportsSitemap: true,
  supportsIndexNow: false,
  supportsPushApi: false,
  supportsManualSubmission: false,
  requiresVerification: false,
  submission: 'none',
  sitemapPath: '/sitemap-index.xml',
  webmasterUrl: 'https://help.openai.com/',
  notes: 'OAI-SearchBot must be crawlable. Google AI and Bing Copilot inherit their search index foundations.',
};
