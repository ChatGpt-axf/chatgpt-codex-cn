import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';

export function getStaticPaths() {
  const verificationFiles = Object.values(siteConfig.searchEngines)
    .filter((engine) => engine.enabled && engine.verification.method === 'html')
    .map((engine) => engine.verification)
    .filter((verification) => /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:html|txt)$/.test(verification.fileName) && verification.fileContent)
    .map((verification) => ({
      params: { verificationFile: verification.fileName },
      props: { content: verification.fileContent },
    }));
  const indexNowKey = import.meta.env.INDEXNOW_KEY;
  if (siteConfig.searchEngines.bing.enabled && siteConfig.searchEngines.bing.indexNow && /^[a-zA-Z0-9_-]{8,128}$/.test(indexNowKey || '')) {
    verificationFiles.push({
      params: { verificationFile: `${indexNowKey}.txt` },
      props: { content: indexNowKey },
    });
  }
  return verificationFiles;
}

export const GET: APIRoute = ({ props }) => new Response(String(props.content), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
