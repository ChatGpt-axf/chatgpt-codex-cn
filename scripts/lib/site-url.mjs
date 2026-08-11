export function normalizeBasePath(value = '/') {
  const normalized = `/${String(value).replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized;
}

export function getSiteOrigin(config) {
  return new URL(config.site.url).origin;
}

export function getProjectRootPath(config) {
  const base = normalizeBasePath(config.site.base);
  return base === '/' ? '/' : `${base}/`;
}

export function getProjectRootUrl(config) {
  return new URL(getProjectRootPath(config), `${getSiteOrigin(config)}/`).toString();
}

export function withSiteBase(value, config) {
  if (!value) return getProjectRootPath(config);
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
  const base = normalizeBasePath(config.site.base);
  const parsed = new URL(value, 'https://internal.invalid/');
  const pathname = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
  const alreadyBased = base === '/' || pathname === base || pathname.startsWith(`${base}/`);
  return `${alreadyBased ? pathname : `${base}${pathname}`}${parsed.search}${parsed.hash}`;
}

export function stripSiteBase(value, config) {
  const base = normalizeBasePath(config.site.base);
  const pathname = new URL(value, 'https://internal.invalid/').pathname;
  if (base === '/') return pathname;
  if (pathname === base) return '/';
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length) || '/';
  return pathname;
}

export function absoluteSiteUrl(value, config) {
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(withSiteBase(value, config), `${getSiteOrigin(config)}/`).toString();
}

export function isProjectUrl(value, config) {
  try {
    const url = new URL(value, getProjectRootUrl(config));
    const base = normalizeBasePath(config.site.base);
    return url.origin === getSiteOrigin(config) && (base === '/' || url.pathname === base || url.pathname.startsWith(`${base}/`));
  } catch {
    return false;
  }
}
