# Site Specification

## Purpose

This repository builds the standalone `chatgpt-codex-cn` Astro content site for Cloudflare Pages. It intentionally uses YAML configuration, Markdown/MDX, Astro Content Collections, and Node.js automation instead of a heavy CMS.

## Runtime Model

- Astro static output with trailing-slash canonical URLs.
- One active site per build, selected by `SITE_ID` and loaded from `sites/<id>.yaml` over `sites/default.yaml`.
- Site-specific content at `src/content/sites/<id>/<collection>/`.
- Shared layouts, components, SEO utilities, scripts, and styles.
- Tailwind CSS 4 through the recommended Vite plugin, with content-focused project CSS.
- Client JavaScript is limited to the optional search page and is not required for navigation or article reading.

## Content Collections

The engine defines `guides`, `comparisons`, `problems`, `faq`, `concepts`, and `news`. Frontmatter validates title, description, slug, dates, taxonomy, intent, entity links, Topic Cluster fields, source records, Direct Answer, key takeaways, and optional FAQ items.

Published routes use `/<collection>/<slug>/`. Dates never appear in URLs. Category, tag, and entity routes are generated from published content and entity data.

## Build Outputs

Every enabled site can generate static HTML, Open Graph and Twitter metadata, canonical and robots directives, JSON-LD, breadcrumb navigation, Sitemap files, `robots.txt`, `rss.xml`, and `llms.txt`. Draft content is not routed. Noindex routes are excluded from Sitemap and RSS.

`@astrojs/sitemap` currently emits a Sitemap index with chunks capped at 10,000 URLs. This keeps the architecture ready for larger sites without changing content routes.

## Multi-Site Contract

Shared code must never infer a brand from `SITE_ID`. All identity and presentation values come from the merged YAML config. `npm run site:create -- --id=<id>` creates a config and isolated content directories; placeholder domain and email values must be reviewed before deployment.

Build a selected site with:

```sh
npm run build
```

## Publishing Gate

Generated or newly scaffolded content remains draft/noindex. Before publishing, run the build, SEO audit, duplicate check, content audit, link check, and Sitemap check. API-driven generation is reserved for a later adapter and must not bypass this gate.
