import { siteConfig } from '../config/site';

export function normalizeBasePath(value: string): string {
  const normalized = `/${String(value || '').replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized;
}

export const basePath = normalizeBasePath(siteConfig.site.base);
export const projectRootPath = basePath === '/' ? '/' : `${basePath}/`;
export const siteOrigin = new URL(siteConfig.site.url).origin;
export const projectRootUrl = new URL(projectRootPath, `${siteOrigin}/`).toString();

export function withBasePath(value: string): string {
  if (!value) return projectRootPath;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
  const parsed = new URL(value, 'https://internal.invalid/');
  const pathname = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
  const alreadyBased = basePath === '/' || pathname === basePath || pathname.startsWith(`${basePath}/`);
  const basedPath = alreadyBased ? pathname : `${basePath}${pathname}`;
  return `${basedPath}${parsed.search}${parsed.hash}`;
}

export function stripBasePath(value: string): string {
  const pathname = new URL(value, 'https://internal.invalid/').pathname;
  if (basePath === '/') return pathname;
  if (pathname === basePath) return '/';
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || '/';
  return pathname;
}

export function absoluteSiteUrl(value = '/'): string {
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(withBasePath(value), `${siteOrigin}/`).toString();
}

export function isProjectUrl(value: string): boolean {
  try {
    const url = new URL(value, projectRootUrl);
    return url.origin === siteOrigin && (basePath === '/' || url.pathname === basePath || url.pathname.startsWith(`${basePath}/`));
  } catch {
    return false;
  }
}
