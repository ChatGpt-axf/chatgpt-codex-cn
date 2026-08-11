export type SearchEngineId = 'google' | 'bing' | 'baidu' | 'so360' | 'sogou' | 'shenma' | 'ai';

export type SubmissionCapability = 'none' | 'indexnow' | 'api-if-entitled' | 'manual';
export type VerificationStatus = 'NOT REQUIRED' | 'CONFIGURED' | 'NOT CONFIGURED';

export interface SearchEngineDefinition {
  id: SearchEngineId;
  name: string;
  crawler: string;
  supportsSitemap: boolean;
  supportsIndexNow: boolean;
  supportsPushApi: boolean;
  supportsManualSubmission: boolean;
  requiresVerification: boolean;
  submission: SubmissionCapability;
  sitemapPath: string;
  webmasterUrl: string;
  notes: string;
}

export interface VerificationConfig {
  method: 'none' | 'meta' | 'html' | 'dns';
  metaName: string;
  value: string;
  fileName: string;
  fileContent: string;
  dnsRecord: string;
}

export interface SearchEngineAdapter extends SearchEngineDefinition {
  enabled: boolean;
  verificationStatus: VerificationStatus;
}
