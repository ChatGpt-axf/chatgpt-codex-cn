# gptaixufei.com

Astro static site shell for `gptaixufei.com`.

## Status

- Site ID: `chatgpt-codex-cn`
- Site type: content site
- Language: `zh-CN`
- Site status: setup
- Public content: cleared
- Indexing: disabled through `noindex` and `robots.txt`
- Search submission: disabled
- Domain: `gptaixufei.com`
- Conversion URL: not used on the public content site

## Cloudflare Pages

Use these settings when connecting the GitHub repository:

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
Root directory: /
Production branch: main
Node.js version: 22
```

Cloudflare Pages is expected to deploy the `main` branch. Keep the site in setup mode until new content is ready.

## Local Verification

```sh
npm install
npm run build
```

The build command uses the local site configuration file:

```text
sites/chatgpt-codex-cn.yaml
```

The public URL is `https://gptaixufei.com/`. Keep `site.status: setup` and `noindex` until new content is ready.

## Content Scope

The previous public content has been removed. New topics, categories, articles, and conversion rules should be defined before publishing fresh content.
