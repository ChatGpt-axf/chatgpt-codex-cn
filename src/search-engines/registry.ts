import { ai } from './ai';
import { baidu } from './baidu';
import { bing } from './bing';
import { google } from './google';
import { shenma } from './shenma';
import { so360 } from './so360';
import { sogou } from './sogou';
import { siteConfig } from '../config/site';
import { withBasePath } from '../utils/url';
import type { SearchEngineAdapter, SearchEngineDefinition, SearchEngineId, VerificationStatus } from './types';

export const searchEngineRegistry: Record<SearchEngineId, SearchEngineDefinition> = {
  google,
  bing,
  baidu,
  so360,
  sogou,
  shenma,
  ai,
};

export const searchEngines = Object.values(searchEngineRegistry);

function configuredVerification(id: SearchEngineId): boolean {
  const setting = siteConfig.searchEngines[id];
  const verification = setting.verification;
  if (setting.verificationCode) return true;
  if (verification.method === 'meta') return Boolean(verification.metaName && verification.value);
  if (verification.method === 'html') return Boolean(verification.fileName && verification.fileContent);
  if (verification.method === 'dns') return Boolean(verification.dnsRecord);
  return false;
}

function getVerificationStatus(id: SearchEngineId): VerificationStatus {
  if (!searchEngineRegistry[id].requiresVerification) return 'NOT REQUIRED';
  return configuredVerification(id) ? 'CONFIGURED' : 'NOT CONFIGURED';
}

export const searchEngineAdapters = Object.fromEntries(
  (Object.keys(searchEngineRegistry) as SearchEngineId[]).map((id) => [id, {
    ...searchEngineRegistry[id],
    sitemapPath: withBasePath(searchEngineRegistry[id].sitemapPath),
    enabled: siteConfig.searchEngines[id].enabled,
    verificationStatus: getVerificationStatus(id),
  }]),
) as Record<SearchEngineId, SearchEngineAdapter>;

export function getSearchEngine(id: SearchEngineId): SearchEngineDefinition {
  return searchEngineRegistry[id];
}

export function getSearchEngineAdapter(id: SearchEngineId): SearchEngineAdapter {
  return searchEngineAdapters[id];
}
