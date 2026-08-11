# Internal Linking

## Relationship Types

- **Pillar:** broad, authoritative topic entry. It links to the most useful cluster tasks.
- **Cluster:** focused task with `parent` pointing to its Pillar slug. It links back to the parent in context.
- **Sibling:** pages sharing a parent. Link only when the second page helps the current task.
- **Entity:** pages connected through a real entity record such as ChatGPT or Codex.
- **Related article:** explicit editorial relationship in `related`, supplemented by conservative relevance scoring.

## Rules

Use natural, descriptive anchors in sentences. Do not repeat the same keyword anchor many times, add links to every entity mention, or run whole-body string replacement. A few relevant links are preferable to dense link blocks.

Pillars should receive more internal links than narrow cluster pages. Each published page must have at least one meaningful incoming link and should expose relevant next steps. Navigation and Sitemap presence do not replace contextual links.

## Automation

`npm run internal-link` scores relationships from `entity`, `keywords`, `parent`, `pillar`, `category`, tags, and explicit `related` values. It prints suggestions and detects missing parents or orphan content; it does not rewrite Markdown automatically.

Rendered article recommendations use the same conservative relationship priorities. Explicit editorial links rank first, then parent/child relationships, shared entities, keywords, taxonomy, and recency.

## Review Checklist

- The anchor accurately describes the destination.
- The destination helps the reader at that exact point.
- Pillar/cluster relationships work in both directions.
- Repeated anchors are not forced across the page.
- Removed or redirected pages have no stale links.
- `npm run link:check` and `npm run internal-link` report no orphan or broken pages.
