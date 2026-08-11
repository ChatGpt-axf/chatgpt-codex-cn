# ChatGPT & Codex 中文指南

Astro static site for the first independent prelaunch content site in the AI SEO/GEO content matrix.

## Status

- Site ID: `chatgpt-codex-cn`
- Site type: content site
- Language: `zh-CN`
- Preview mode: enabled
- Production publishing: disabled
- Indexing: disabled through `noindex` and `robots.txt`
- Search submission: disabled
- Conversion URL: `https://cwx.aixufei.com/`

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

No DNS binding or custom production domain is configured in this repository yet.

## Local Verification

```sh
npm install
npm run build
```

The build command uses the local site configuration file:

```text
sites/chatgpt-codex-cn.yaml
```

The current placeholder public URL is `https://pending-domain.invalid/`. Replace it only after the real production domain is selected.

## Content Scope

The site is positioned as a practical Chinese guide for ChatGPT, ChatGPT Plus, ChatGPT Pro, Codex, OpenAI, and AI tools. The initial topic clusters cover:

- ChatGPT Plus
- Codex
- Plus vs Pro
- ChatGPT Plus 国内订阅
- Codex 是什么
- Codex 额度不足
- ChatGPT Plus 使用指南

Conversion links should stay soft: ordinary pages should use zero or one natural conversion link only when the reader has a clear subscription or upgrade intent.
