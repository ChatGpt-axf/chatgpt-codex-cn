import fs from 'node:fs';
import path from 'node:path';
import { compactText, readContent } from './lib/content.mjs';
import { getHtmlPages } from './lib/build-site.mjs';
import { crawlerAllowed } from './lib/search-engines.mjs';
import { loadSiteConfig } from './lib/content.mjs';
import { withSiteBase } from './lib/site-url.mjs';

const config = loadSiteConfig();
const prelaunchMode = config.site.status !== 'active';
const entries = readContent({ includeDrafts: false })
  .filter((entry) => prelaunchMode || !entry.data.noindex);
const pages = new Map(getHtmlPages().map((page) => [page.route, page]));
const robotsFile = path.resolve('dist/robots.txt');
const robots = fs.existsSync(robotsFile) ? fs.readFileSync(robotsFile, 'utf8') : '';
const errors = [];
const warnings = [];
const pageReports = [];

const vaguePronouns = /(?:\u5b83|\u5b83\u4eec|\u8fd9\u4e2a|\u8fd9\u4e9b|\u8fd9\u79cd|\u8be5|\u5176)/gu;
const marketingPhrases = /(?:\u9707\u60ca|\u98a0\u8986|\u5fc5\u5907\u795e\u5668|\u65e0\u654c|\u79d2\u6740|\u95ed\u773c\u5165|\u4e0d\u5bb9\u9519\u8fc7|\u5168\u7f51\u6700\u5f3a|\u7ec8\u6781\u89e3\u51b3\u65b9\u6848)/gu;
const aiCliches = /(?:\u4f5c\u4e3a\u4e00\u4e2a\s*AI|\u5728\u5f53\u4eca\u5feb\u901f\u53d1\u5c55\u7684|\u503c\u5f97\u6ce8\u610f\u7684\u662f|\u603b\u800c\u8a00\u4e4b|\u7efc\u4e0a\u6240\u8ff0|\u968f\u7740.{0,12}\u4e0d\u65ad\u53d1\u5c55)/gu;
const explanatoryLanguage = /(?:\u662f|\u6307|\u7528\u4e8e|\u901a\u8fc7|\u53ef\u4ee5|\u652f\u6301|\u9002\u5408|\u63d0\u4f9b|\u610f\u5473\u7740)/u;
const stepLanguage = /(?:\u6b65\u9aa4|\u65b9\u6cd5|\u5982\u4f55|\u6392\u67e5|\u6838\u5bf9|\u9009\u62e9|\u8bbe\u7f6e|\u5b9a\u4e49|\u8ba1\u7b97)/u;

function issue(target, severity, code, message) {
  const item = { code, message, file: target.file, url: target.url };
  target[severity].push(item);
  (severity === 'errors' ? errors : warnings).push(item);
}

for (const entry of entries) {
  const page = pages.get(entry.url);
  const target = {
    key: entry.key,
    file: entry.file,
    url: entry.url,
    checks: {},
    errors: [],
    warnings: [],
    status: 'READY',
  };
  const bodyLength = compactText(entry.body).length;
  const directAnswer = compactText(entry.data.directAnswer || '');
  const entities = (entry.data.entity || []).map((value) => String(value).toLowerCase());
  const entityText = `${entry.data.title} ${entry.data.description} ${entry.data.directAnswer} ${entry.body}`.toLowerCase();
  const pronounCount = (entry.body.match(vaguePronouns) || []).length;
  const marketingCount = (entry.body.match(marketingPhrases) || []).length;
  const aiClicheCount = (entry.body.match(aiCliches) || []).length;
  const hasMarkdownTable = /\|[^\n]+\|\s*\n\|\s*:?-{3,}/.test(entry.body);
  const hasSteps = /^\s*\d+\.\s+/m.test(entry.body) || stepLanguage.test(entry.body);

  target.checks.directAnswer = directAnswer.length >= 40;
  target.checks.explicitEntities = entities.length > 0 && entities.some((entity) => entityText.includes(entity));
  target.checks.independentAnswer = bodyLength >= 450 && directAnswer.length >= 40;
  target.checks.sources = (entry.data.sources || []).length > 0;
  target.checks.author = Boolean(entry.data.author);
  target.checks.updated = Boolean(entry.data.updated && new Date(entry.data.updated) >= new Date(entry.data.date));
  target.checks.definitionSentence = explanatoryLanguage.test(entry.data.directAnswer || '');
  target.checks.keyTakeaways = (entry.data.keyTakeaways || []).length >= 2 && Boolean(page && page.$('.takeaways li').length >= 2);
  target.checks.tablePresent = hasMarkdownTable;
  target.checks.comparisonTable = entry.data.intent !== 'comparison' || hasMarkdownTable;
  target.checks.actionableSteps = hasSteps;
  target.checks.faq = (entry.data.faq || []).length > 0;
  target.checks.topicCluster = Boolean(entry.data.pillar || entry.data.parent);
  target.checks.relatedContent = (entry.data.related || []).length >= 2 && Boolean(page && page.$('.related-section a[href]').length > 0);
  target.checks.internalLinks = entry.internalLinks.length > 0;
  target.checks.clearEntityReferences = pronounCount / Math.max(bodyLength, 1) < 0.025;
  target.checks.noAiCliches = aiClicheCount < 2;
  target.checks.noMarketingFluff = marketingCount < 2;
  target.checks.staticPrimaryContent = Boolean(page && page.$('main').text().replace(/\s+/g, '').length >= 80);
  target.checks.headingHierarchy = Boolean(page && page.$('h1').length === 1 && page.$('h2').length >= 1 && page.$('h1, h2').first().is('h1'));
  target.checks.renderedDirectAnswer = Boolean(page && page.$('.direct-answer').text().replace(/\s+/g, '').length >= 40);
  target.checks.renderedMetadata = Boolean(page && /\u4f5c\u8005/.test(page.$('.article-byline').text()) && page.$('.article-byline time').length >= 2);
  target.checks.mobileViewport = Boolean(page && page.$('meta[name="viewport"]').length === 1);
  target.checks.lightweightHtml = Boolean(page && Buffer.byteLength(page.html) <= 500_000);

  if (!target.checks.directAnswer) issue(target, 'errors', 'direct-answer', 'Direct Answer is missing or too short.');
  if (!target.checks.explicitEntities) issue(target, 'errors', 'entity', 'No explicit product or technology entity is established.');
  if (!target.checks.independentAnswer) issue(target, 'errors', 'independent-answer', 'The page cannot independently answer its target question.');
  if (!target.checks.sources) issue(target, 'errors', 'sources', 'Published content has no factual sources.');
  if (!target.checks.author) issue(target, 'errors', 'author', 'Author metadata is missing.');
  if (!target.checks.updated) issue(target, 'errors', 'updated', 'A valid updated date is missing.');
  if (!target.checks.definitionSentence) issue(target, 'warnings', 'definition', 'Direct Answer has no clear explanatory or definition sentence.');
  if (!target.checks.keyTakeaways) issue(target, 'errors', 'key-takeaways', 'At least two visible Key Takeaways are required.');
  if (!target.checks.comparisonTable) issue(target, 'errors', 'comparison-table', 'Comparison intent requires a scannable comparison table.');
  if (!target.checks.actionableSteps) issue(target, 'warnings', 'steps', 'No clear steps, method, or verification sequence is present.');
  if (!target.checks.faq) issue(target, 'warnings', 'faq', 'No concise FAQ is available for common follow-up questions.');
  if (!target.checks.topicCluster) issue(target, 'errors', 'topic-cluster', 'Page is not assigned as a pillar or cluster child.');
  if (!target.checks.relatedContent) issue(target, 'errors', 'related-content', 'Related content is missing from data or generated HTML.');
  if (!target.checks.internalLinks) issue(target, 'errors', 'internal-links', 'Body has no contextual internal link.');
  if (!target.checks.clearEntityReferences) issue(target, 'warnings', 'vague-pronouns', `Vague pronoun density is high (${pronounCount} matches).`);
  if (!target.checks.noAiCliches) issue(target, 'warnings', 'ai-cliches', `Generic AI-style filler appears ${aiClicheCount} times.`);
  if (!target.checks.noMarketingFluff) issue(target, 'warnings', 'marketing-language', `Marketing superlatives appear ${marketingCount} times.`);
  if (!target.checks.staticPrimaryContent) issue(target, 'errors', 'static-html', 'Primary content is missing from generated HTML or requires JavaScript.');
  if (!target.checks.headingHierarchy) issue(target, 'errors', 'headings', 'Expected exactly one H1 followed by one or more H2 sections.');
  if (!target.checks.renderedDirectAnswer) issue(target, 'errors', 'rendered-answer', 'Direct Answer is not present in generated HTML.');
  if (!target.checks.renderedMetadata) issue(target, 'errors', 'rendered-metadata', 'Author and publication/update dates are not visible in generated HTML.');
  if (!target.checks.mobileViewport) issue(target, 'errors', 'viewport', 'Mobile viewport metadata is missing.');
  if (!target.checks.lightweightHtml) issue(target, 'warnings', 'html-size', 'Generated HTML exceeds 500 KB.');

  target.status = target.errors.length > 0 ? 'ERROR' : target.warnings.length > 0 ? 'WARNING' : 'READY';
  pageReports.push(target);
}

const crawler = {
  name: 'OAI-SearchBot',
  policy: prelaunchMode ? 'prelaunch-blocked' : 'active-site-required',
  robotsPresent: Boolean(robots),
  allowed: Boolean(robots && crawlerAllowed(robots, 'OAI-SearchBot', entries[0]?.url || withSiteBase('/', config))),
};
if (!crawler.robotsPresent) errors.push({ code: 'robots', message: 'robots.txt is missing.', file: 'dist/robots.txt', url: '/' });
else if (!crawler.allowed && !prelaunchMode) errors.push({ code: 'oai-searchbot', message: 'OAI-SearchBot is blocked from published content.', file: 'dist/robots.txt', url: entries[0]?.url || '/' });

const status = errors.length > 0 ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'READY';
const report = {
  generatedAt: new Date().toISOString(),
  status,
  crawler,
  totals: { pages: pageReports.length, errors: errors.length, warnings: warnings.length },
  errors,
  warnings,
  pages: pageReports,
  note: 'GEO readiness improves machine discoverability and answerability but does not guarantee indexing, ranking, or citation.',
  prelaunchMode,
};
fs.mkdirSync(path.resolve('reports'), { recursive: true });
fs.writeFileSync(path.resolve('reports/geo-audit.json'), `${JSON.stringify(report, null, 2)}\n`);

for (const item of errors) console.error(`ERROR [${item.code}] ${item.message} (${item.file})`);
for (const item of warnings) console.warn(`WARN  [${item.code}] ${item.message} (${item.file})`);
console.log('\nGEO Audit Summary');
console.log(`Status: ${status}`);
console.log(`Pages: ${pageReports.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`OAI-SearchBot allowed: ${crawler.allowed ? 'Yes' : 'No'}`);
console.log('Report: reports/geo-audit.json');
if (errors.length > 0) process.exitCode = 1;
