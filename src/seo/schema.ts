import type { AnyContentEntry } from '../utils/content';
import { contentPath } from '../utils/content';
import { siteConfig } from '../config/site';
import { absoluteSiteUrl, projectRootUrl } from '../utils/url';

type BreadcrumbItem = { name: string; path: string };

export function absoluteUrl(value: string): string {
  return absoluteSiteUrl(value);
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${projectRootUrl}#website`,
    url: projectRootUrl,
    name: siteConfig.site.name,
    alternateName: siteConfig.site.shortName,
    description: siteConfig.site.description,
    inLanguage: siteConfig.site.language,
    publisher: { '@id': `${projectRootUrl}#organization` },
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${projectRootUrl}#organization`,
    name: siteConfig.organization.name,
    legalName: siteConfig.organization.legalName,
    description: siteConfig.organization.description,
    url: projectRootUrl,
    logo: absoluteUrl(siteConfig.organization.logo),
    email: siteConfig.organization.email,
  };
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webPageSchema(input: {
  title: string;
  description: string;
  path: string;
  type?: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage';
}) {
  return {
    '@context': 'https://schema.org',
    '@type': input.type || 'WebPage',
    '@id': `${absoluteUrl(input.path)}#webpage`,
    url: absoluteUrl(input.path),
    name: input.title,
    description: input.description,
    inLanguage: siteConfig.site.language,
    isPartOf: { '@id': `${projectRootUrl}#website` },
    about: { '@id': `${projectRootUrl}#organization` },
  };
}

export function articleSchema(entry: AnyContentEntry) {
  return {
    '@context': 'https://schema.org',
    '@type': entry.collection === 'news' ? 'BlogPosting' : 'Article',
    '@id': `${absoluteUrl(contentPath(entry))}#article`,
    headline: entry.data.title,
    description: entry.data.description,
    datePublished: entry.data.date.toISOString(),
    dateModified: entry.data.updated.toISOString(),
    inLanguage: siteConfig.site.language,
    mainEntityOfPage: absoluteUrl(contentPath(entry)),
    author: { '@type': 'Person', name: entry.data.author },
    publisher: { '@id': `${projectRootUrl}#organization` },
    image: absoluteUrl(siteConfig.seo.defaultOgImage),
    keywords: entry.data.keywords.join(', '),
  };
}

export function faqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
