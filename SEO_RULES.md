# SEO Rules

## Title

Each indexable page has one unique, descriptive title. Put the page task first and apply the site title template once. Avoid truncation bait, repeated boilerplate, or keyword lists.

## Description

Every indexable page has one unique description that accurately previews the answer and scope. Descriptions should be useful to a reader; they are not a place to repeat keyword variants.

## H1 And Headings

Use exactly one H1 for the visible page topic. H2 and H3 headings form a meaningful hierarchy and describe the section that follows. Do not create headings only to insert keywords.

## URLs

Use short, stable, lowercase, hyphenated slugs without dates. Moving a published URL requires a direct redirect to the new canonical URL and updates to internal links.

## Canonical

Every HTML page emits one absolute canonical URL on the configured site origin. Indexable pages are self-canonical. Never canonicalize unrelated or materially different pages together.

## Indexability

Drafts are not generated. Incomplete or low-value pages remain `noindex: true`. Noindex pages must not appear in Sitemap or RSS. Do not combine `noindex` with accidental blocking that prevents crawlers from seeing the directive.

## Internal Linking

Link where another page genuinely helps complete the current task. Pillars receive links from clusters and link back to useful cluster pages. Detect and fix orphan pages. Use varied, descriptive anchors without repeated exact-match patterns.

## Image SEO

Every image has an `alt` attribute. Informative images describe the information they convey; decorative images use empty alt text. Compress raster assets, provide stable dimensions, and lazy-load content images below the first viewport.

## Schema

Schema must match visible content and config data. Use WebSite, Organization, WebPage, CollectionPage, Article or BlogPosting, BreadcrumbList, AboutPage, ContactPage, and FAQPage only when the page supports that type. FAQPage is forbidden without visible FAQ content. JSON-LD must parse as valid JSON.

## Sitemap

Include only canonical, indexable, non-draft, non-redirect URLs. Content entries include `lastmod`, preferring `updated` over `date`. Sitemap chunks stay below protocol limits and are referenced from `robots.txt`.

## Robots

Public pages are crawlable by default. The site config controls AI crawler policy with `allow`, `disallow`, or explicit custom lines. Never silently block AI crawlers. Always include the configured Sitemap URL.

## Pagination

Collection pagination, when introduced, must expose crawlable links, unique self-canonicals, and stable page URLs. Do not canonicalize every paginated page to page one. Empty or filter-only combinations should not be indexed by default.

## Duplicate Content

Merge pages with the same intent, core answer, and useful structure. Run exact, shingle, Jaccard, description, and keyword-overlap checks before publication. Boilerplate and small location or keyword substitutions do not justify separate URLs.

## Redirects

Use 301 for permanent moves and 302 only for genuinely temporary routing. Redirect sources stay out of Sitemap. Avoid chains, loops, irrelevant destinations, and mass redirects to the homepage.

## 404

Missing URLs return a real 404 status in deployment and use the custom 404 document. The page is noindex and offers the homepage, core sections, search when enabled, and useful content links.

## Core Web Vitals

Prefer static HTML, limited JavaScript, compressed images, stable media dimensions, system fonts, and no unnecessary hydration. Avoid layout shifts, render-blocking third-party scripts, long main-thread tasks, and oversized first-viewport assets.
