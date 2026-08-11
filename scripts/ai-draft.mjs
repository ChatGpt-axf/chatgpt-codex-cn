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

function asYamlList(items) {
  return Array.isArray(items) && items.length > 0
    ? `[${items.map((item) => yamlString(item)).join(', ')}]`
    : '[]';
}

function frontmatter({ title, description, slug, today, site, plan, conversionLevel }) {
  const intent = plan.searchIntent || 'informational';
  const entities = Array.isArray(plan.entity) ? plan.entity : [];
  const related = Array.isArray(plan.internalLinks) ? plan.internalLinks : [];
  return `---
title: ${yamlString(title)}
description: ${yamlString(description)}
slug: ${slug}
date: ${today}
updated: ${today}
category: ${yamlString(plan.category || '待分类')}
tags: ${asYamlList(plan.tags)}
keywords: ${plan.keyword ? `[${yamlString(plan.keyword)}]` : asYamlList(plan.keywords)}
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
  - 待人工核验的核心结论一。
  - 待人工核验的核心结论二。
faq: []
---`;
}

function draftBody(plan) {
  const questions = Array.isArray(plan.questions) ? plan.questions : [];
  const sourcesNeeded = Array.isArray(plan.sourcesNeeded) ? plan.sourcesNeeded : [];
  const sections = [
    '## 草稿范围',
    '',
    `目标搜索意图：${plan.searchIntent || 'informational'}。这份草稿只能进入人工审核，不能直接发布。`,
    '',
    '## 直接回答待核验',
    '',
    plan.directAnswerGoal || '在这里写出可被来源支持的直接答案。',
    '',
    '## 正文结构',
    '',
    '1. 明确用户问题和适用场景。',
    '2. 给出步骤、判断标准或对比维度。',
    '3. 标注会变化的信息，并回到官方来源核验。',
    '4. 补充自然的内部链接和必要的转化入口。',
    '',
  ];
  if (questions.length > 0) {
    sections.push('## 待回答问题', '', ...questions.map((item) => `- ${item}`), '');
  }
  if (sourcesNeeded.length > 0) {
    sections.push('## 待补来源', '', ...sourcesNeeded.map((item) => `- ${item}`), '');
  }
  sections.push('## 审核要求', '', '发布前必须补齐来源、正文、FAQ、内部链接，并通过 SEO/GEO/重复度/链接检查。');
  return sections.join('\n');
}

const args = parseArgs();
if (!args.plan) throw new Error('Usage: npm run ai:draft -- --plan=data/content-plans/example.yaml --type=guide --slug=example');

const siteId = assertSafeId(String(args.site || SITE_ID), 'Site id');
const site = loadSiteConfig(siteId);
const requestedType = String(args.type || 'guide');
const collection = TYPE_MAP[requestedType];
if (!collection || !CONTENT_TYPES.includes(collection)) throw new Error(`Unknown content type: ${requestedType}`);

const planPath = path.resolve(String(args.plan));
if (!fs.existsSync(planPath)) throw new Error(`Content plan not found: ${planPath}`);
const plan = loadYaml(fs.readFileSync(planPath, 'utf8')) || {};
const slug = assertSafeId(String(args.slug || plan.slug || ''), 'Slug');
const title = String(args.title || plan.suggestedTitle || '待完善的内容标题');
const description = String(plan.description || '这是一份 AI 辅助生成草稿，发布前必须补齐事实来源、正文细节和人工审核记录。');
const conversionLevel = ['none', 'soft', 'normal'].includes(String(plan.conversionLevel || args.conversionLevel || ''))
  ? String(plan.conversionLevel || args.conversionLevel)
  : site.content.defaultConversionLevel || 'soft';
const today = new Date().toISOString().slice(0, 10);
const directory = path.resolve(`src/content/sites/${siteId}/${collection}`);
if (!fs.existsSync(directory)) throw new Error(`Site content directory not found: ${directory}`);
const extension = args.mdx ? 'mdx' : 'md';
const output = path.join(directory, `${slug}.${extension}`);
if (fs.existsSync(output)) throw new Error(`Content file already exists: ${output}`);

const content = [
  frontmatter({ title, description, slug, today, site, plan, conversionLevel }),
  '',
  draftBody(plan),
  '',
].join('\n');

fs.writeFileSync(output, content, { flag: 'wx' });
console.log(`Created AI-assisted draft: ${path.relative(process.cwd(), output)}`);
console.log('Status is draft/noindex. Human review and all audits are required before publication.');
