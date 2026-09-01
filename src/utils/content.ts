import { getCollection, type CollectionEntry } from 'astro:content';
import { withBasePath } from './url';

export const CONTENT_COLLECTIONS = [
  'guides',
  'comparisons',
  'problems',
  'faq',
  'concepts',
  'news',
] as const;

export type ContentCollection = (typeof CONTENT_COLLECTIONS)[number];
export type AnyContentEntry = CollectionEntry<ContentCollection>;

export const COLLECTION_LABELS: Record<ContentCollection, string> = {
  guides: '实用指南',
  comparisons: '产品对比',
  problems: '常见问题',
  faq: '常见问题',
  concepts: '核心概念',
  news: '更新动态',
};

export async function getAllContent(): Promise<AnyContentEntry[]> {
  const groups = await Promise.all(CONTENT_COLLECTIONS.map((name) => getCollection(name)));
  return groups.flat() as AnyContentEntry[];
}

export async function getPublishedContent(): Promise<AnyContentEntry[]> {
  return (await getAllContent())
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => b.data.updated.getTime() - a.data.updated.getTime());
}

export function contentPath(entry: AnyContentEntry): string {
  return withBasePath(`/${entry.collection}/${entry.data.slug}/`);
}

export function contentKey(entry: AnyContentEntry): string {
  return `${entry.collection}/${entry.data.slug}`;
}

export function toUrlSegment(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

function overlap(left: string[], right: string[]): number {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.filter((item) => rightSet.has(item.toLowerCase())).length;
}

export function findContentReference(entries: AnyContentEntry[], reference: string): AnyContentEntry | undefined {
  const normalized = reference.replace(/^\/+|\/+$/g, '');
  return entries.find((entry) => contentKey(entry) === normalized || entry.data.slug === normalized);
}

export function getRelatedContent(
  current: AnyContentEntry,
  entries: AnyContentEntry[],
  limit: number,
): AnyContentEntry[] {
  const manual = new Set(current.data.related);
  return entries
    .filter((entry) => contentKey(entry) !== contentKey(current) && !entry.data.draft)
    .map((entry) => {
      let score = 0;
      if (manual.has(entry.data.slug) || manual.has(contentKey(entry))) score += 20;
      if (current.data.parent && current.data.parent === entry.data.slug) score += 12;
      if (entry.data.parent && entry.data.parent === current.data.slug) score += 12;
      if (current.data.parent && entry.data.parent === current.data.parent) score += 6;
      if (current.data.pillar && entry.data.parent === current.data.slug) score += 10;
      if (entry.data.pillar && current.data.parent === entry.data.slug) score += 10;
      score += overlap(current.data.entity, entry.data.entity) * 5;
      score += overlap(current.data.keywords, entry.data.keywords) * 2;
      score += overlap(current.data.tags, entry.data.tags);
      if (current.data.category === entry.data.category) score += 2;
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.entry.data.updated.getTime() - a.entry.data.updated.getTime())
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export function formatDate(date: Date, locale = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
