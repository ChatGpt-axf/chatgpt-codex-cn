# Content Guide

## Core Standard

Write for people first and search intent first. One page should complete one main search task and add value beyond restating existing pages. Keywords are research inputs, not automatic page instructions.

## Before Drafting

1. Identify the audience, task, expected answer, and evidence needed.
2. Compare nearby keywords. Merge those with the same intent, answer, and useful structure.
3. Choose a Pillar or parent relationship and relevant entities.
4. Collect primary sources before writing factual claims.
5. Define what this page adds that existing pages do not.

## Required Page Elements

Published content needs accurate frontmatter, one clear H1 from the title, a concise Direct Answer, key takeaways, structured body sections, contextual internal links, source records, author, publication date, and meaningful update date. Use FAQ, steps, or comparison tables only when they help answer the task.

## Sources

Prefer official documentation, standards, original research, regulatory sources, and first-party announcements. Never invent a citation or cite a page that does not support the claim. For changing product details, explain the verification date and direct readers to the live official page.

## Prohibited Content

- Generic AI filler, keyword stuffing, fake quotations, and repetitive word-count padding.
- Fabricated tests, measurements, user reviews, cases, credentials, partnerships, or certifications.
- Rewrites that add no new organization, evidence, explanation, or practical value.
- Template pages differing only by keyword, product, or city names.
- Fixed promises about prices, limits, or features when the source can change.

## Draft And Publication

Use `npm run content:create -- --type=guide --slug=example` to scaffold content, or `npm run ai:draft -- --plan=data/content-plans/example.yaml --type=guide --slug=example` to create a guarded AI-assisted draft from an approved plan. New files start as `status: draft`, `draft: true`, and `noindex: true`. Human review is mandatory. A page can be published only after factual checks and these commands pass:

```sh
npm run build
npm run content:audit
npm run content:duplicate
npm run seo:check
npm run link:check
npm run sitemap:check
```

Low-scoring content may remain in the repository only as `draft: true` or `noindex: true` while it is improved.
