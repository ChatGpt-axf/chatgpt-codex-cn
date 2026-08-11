import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { activeSiteId } from './config/site';

const sourceSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  publisher: z.string().min(1),
  accessed: z.coerce.date(),
});

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const contentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  date: z.coerce.date(),
  updated: z.coerce.date(),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  author: z.string().min(1),
  status: z.enum([
    'planned',
    'draft',
    'review',
    'approved',
    'scheduled',
    'published',
    'update-needed',
    'merged',
    'rejected',
  ]).default('draft'),
  draft: z.boolean().default(true),
  noindex: z.boolean().default(true),
  conversionLevel: z.enum(['none', 'soft', 'normal']).default('soft'),
  featured: z.boolean().default(false),
  pillar: z.boolean().default(false),
  parent: z.string().nullable().default(null),
  intent: z.enum(['informational', 'commercial', 'comparison', 'troubleshooting', 'navigational']),
  entity: z.array(z.string()).default([]),
  related: z.array(z.string()).default([]),
  sources: z.array(sourceSchema).default([]),
  directAnswer: z.string().min(20),
  keyTakeaways: z.array(z.string()).min(2).max(6),
  faq: z.array(faqSchema).default([]),
});

function contentCollection(name: string) {
  return defineCollection({
    loader: glob({
      base: `./src/content/sites/${activeSiteId}/${name}`,
      pattern: '**/*.{md,mdx}',
    }),
    schema: contentSchema,
  });
}

export const collections = {
  guides: contentCollection('guides'),
  comparisons: contentCollection('comparisons'),
  problems: contentCollection('problems'),
  faq: contentCollection('faq'),
  concepts: contentCollection('concepts'),
  news: contentCollection('news'),
};
