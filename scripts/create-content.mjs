import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { assertSafeId, parseArgs } from './lib/args.mjs';
import { CONTENT_TYPES, SITE_ID, loadSiteConfig } from './lib/content.mjs';

const TYPE_MAP = {
  guide: 'guides', guides: 'guides', comparison: 'comparisons', comparisons: 'comparisons',
  problem: 'problems', problems: 'problems', faq: 'faq', concept: 'concepts', concepts: 'concepts',
  news: 'news',
};

function yamlString(value) {
  return JSON.stringify(String(value));
}

const args = parseArgs();
const siteId = assertSafeId(String(args.site || SITE_ID), 'Site id');
const site = loadSiteConfig(siteId);
const requestedType = String(args.type || 'guide');
const collection = TYPE_MAP[requestedType];
if (!collection || !CONTENT_TYPES.includes(collection)) throw new Error(`Unknown content type: ${requestedType}`);
const slug = assertSafeId(String(args.slug || ''), 'Slug');

let plan = {};
if (args.plan) {
  const planPath = path.resolve(String(args.plan));
  if (!fs.existsSync(planPath)) throw new Error(`Content plan not found: ${planPath}`);
  plan = loadYaml(fs.readFileSync(planPath, 'utf8')) || {};
}

const directory = path.resolve(`src/content/sites/${siteId}/${collection}`);
if (!fs.existsSync(directory)) throw new Error(`Site content directory not found: ${directory}`);
const extension = args.mdx ? 'mdx' : 'md';
const output = path.join(directory, `${slug}.${extension}`);
if (fs.existsSync(output)) throw new Error(`Content file already exists: ${output}`);

const today = new Date().toISOString().slice(0, 10);
const title = args.title || plan.suggestedTitle || '待完善的内容标题';
const intent = plan.searchIntent || 'informational';
const entities = Array.isArray(plan.entity) ? plan.entity : [];
const related = Array.isArray(plan.internalLinks) ? plan.internalLinks : [];
const conversionLevel = ['none', 'soft', 'normal'].includes(String(plan.conversionLevel || args.conversionLevel || ''))
  ? String(plan.conversionLevel || args.conversionLevel)
  : site.content.defaultConversionLevel || 'soft';
const template = `---
title: ${yamlString(title)}
description: ${yamlString('请在发布前填写准确、具体且与正文一致的页面描述。')}
slug: ${slug}
date: ${today}
updated: ${today}
category: ${yamlString('待分类')}
tags: []
keywords: ${plan.keyword ? `[${yamlString(plan.keyword)}]` : '[]'}
author: ${yamlString(site.content.author || '编辑团队')}
status: draft
draft: true
noindex: true
conversionLevel: ${conversionLevel}
featured: false
pillar: ${Boolean(plan.pillar)}
parent: ${plan.parent ? yamlString(plan.parent) : 'null'}
intent: ${intent}
entity: ${JSON.stringify(entities)}
related: ${JSON.stringify(related)}
sources: []
directAnswer: ${yamlString(plan.directAnswerGoal || '请用大约 50 到 120 字直接回答页面的核心问题，并在发布前核验所有事实。')}
keyTakeaways:
  - 待填写第一条可验证的核心结论。
  - 待填写第二条可执行的核心结论。
faq: []
---

## 主要内容

在这里完成正文。先解决主要搜索任务，再补充方法、适用场景、限制、内部链接和来源。

## 发布前检查

保留 \`draft: true\` 与 \`noindex: true\`，直到人工审核以及 \`content:audit\`、\`content:duplicate\`、\`seo:check\` 全部通过。
`;

fs.writeFileSync(output, template, { flag: 'wx' });
console.log(`Created draft: ${path.relative(process.cwd(), output)}`);
console.log('The draft is intentionally noindex and cannot be auto-published.');
