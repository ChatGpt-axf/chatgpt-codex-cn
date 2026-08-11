# Agent Instructions

This repository is a multi-site static SEO/GEO content engine built with Astro, TypeScript, Tailwind CSS, Markdown/MDX, Content Collections, and Node.js scripts.

Before modifying code or content, read:

- `SITE_SPEC.md`
- `SEO_RULES.md`
- `GEO_RULES.md`
- `CHINA_SEO_RULES.md`
- `GOOGLE_BING_SEO_RULES.md`
- `SUBDIRECTORY_DEPLOYMENT.md`
- `CONTENT_GUIDE.md`
- `INTERNAL_LINKING.md`

## Required Principles

- Preserve static output, minimal client JavaScript, accessibility, performance, content quality, SEO, GEO, and the multi-site configuration boundary.
- Read all brand, domain, color, navigation, contact, publisher, analytics, and feature values from `sites/*.yaml`. Never hardcode a site identity in shared components.
- Keep canonical URLs stable and correct. Do not remove existing metadata, structured data, robots rules, sitemap exclusions, or `lastmod` values without a documented replacement.
- New content starts as `draft: true` and `noindex: true`. Publish only after human review and all audits pass.
- Prefer one useful page per search task. Merge keywords that share search intent, core answer, and page structure.
- Use real sources and factual page data. Never invent experts, tests, reviews, partnerships, certifications, quotes, or usage data.
- Keep internal anchors natural and contextual. Pillars link to clusters; clusters link back to pillars; avoid repeated exact-match anchor text.

## Prohibited Changes

- Hardcoded brands, domains, emails, navigation, colors, or API keys in shared code.
- Keyword stuffing, keyword-density targets, city-name substitution pages, thin templates, or mass near-duplicate pages.
- Low-value pages created only to gain search traffic.
- Claims that any search engine or AI answer system is guaranteed to rank, cite, or index the site.
- Destructive changes to canonical, sitemap, robots, redirect, or indexability behavior.

## Verification

Run `npm run build` after every implementation change. For content changes, also run:

```sh
npm run seo:check
npm run content:duplicate
npm run content:audit
npm run link:check
npm run search:audit
npm run geo:audit
```

Run `npm run sitemap:check` when routes, indexability, canonical metadata, or dates change. Run `npm run production:check` for every production build. Use `npm run publish:prepare` for the complete release gate and URL-file preparation. Treat nonzero audit exits as release blockers.
