# GEO Rules

GEO in this project means making useful pages easier for people and AI systems to interpret. It does not guarantee inclusion or citation by ChatGPT, Google AI features, Perplexity, or any other product.

## Answer Structure

- State the main question in the H1 and answer it near the top.
- Keep Direct Answer concise, usually about 50 to 120 Chinese characters for this site.
- Follow with two to six concrete key takeaways.
- Use headings that expose definitions, steps, comparisons, applicability, limits, and verification methods.
- Prefer tables for real comparisons, lists for ordered actions, and prose where nuance matters.

## Entities And Meaning

Reference entities by stable IDs from `data/entities/`. Use canonical names consistently, record aliases, link to official URLs, and connect related entities. Do not imply ownership, partnership, or endorsement.

## Facts And Sources

Separate verified facts from inference and recommendations. Important, changeable claims should cite current official documentation or another primary source. Render source title, publisher, URL, and access date. Update the content and `updated` date only after a meaningful review.

## Topic Clusters

Pillar pages define the broad task and route readers to focused cluster pages. Cluster pages link back to their parent and connect to relevant sibling or entity pages. The graph should help a reader continue naturally, not maximize link count.

## Language

Use precise definitions, explicit nouns, short introductions, and meaningful transitions. Reduce vague marketing language, unsupported superlatives, filler, and repetitive conclusions. Make limitations and conditions visible.

## FAQ

FAQ items must reflect questions actually answered on the page. Answers should stand alone without contradicting the main text. Generate FAQPage schema only when the questions and answers are visible.

## Auxiliary Files

`llms.txt` lists the site purpose, core sections, and important canonical pages as a discovery aid. It is not treated as a ranking factor or a substitute for crawlable HTML, structured data, internal links, or sources. Generate `llms-full.txt` only when a demonstrated consumer need justifies its size.
