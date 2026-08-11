# Cloudflare Pages Deployment

This repository is prepared for Cloudflare Pages as a standalone Astro project.

```text
Build command: npm run build
Build output directory: dist
Production branch: main
```

The current site remains in prelaunch mode:

- `previewMode=true`
- `productionEnabled=false`
- `noindex=true`
- search submission disabled
- no DNS binding
- no custom production domain

Do not bind a production domain until `sites/chatgpt-codex-cn.yaml` has been updated from `pending-domain.invalid` to the real public domain and all search engine verification values are configured.
