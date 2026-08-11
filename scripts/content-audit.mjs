import { compactText, readContent, similarity } from './lib/content.mjs';
import { AuditReport } from './lib/report.mjs';

const allEntries = readContent();
const entries = allEntries.filter((entry) => !entry.data.draft);
const report = new AuditReport('Content Audit Summary', entries.length);
const scores = [];

for (const draft of allEntries.filter((entry) => entry.data.draft)) {
  if (!draft.data.noindex) report.error('draft-indexable', 'Draft content must set noindex: true', draft.file);
  else report.pass();
}

for (const entry of entries) {
  let score = 0;
  const bodyLength = compactText(entry.body).length;
  const directLength = compactText(entry.data.directAnswer || '').length;
  const sources = entry.data.sources || [];
  const related = entry.data.related || [];

  if (bodyLength < 450) report.warn('short-content', `Body has only ${bodyLength} normalized characters`, entry.file);
  else { score += 25; report.pass(); }

  if (!entry.data.directAnswer) report.error('missing-direct-answer', 'Direct Answer is missing', entry.file);
  else {
    score += 20;
    if (directLength < 40 || directLength > 150) report.warn('direct-answer-length', `Direct Answer has ${directLength} characters; aim for about 50-120`, entry.file);
    else report.pass();
  }

  if ((entry.data.keyTakeaways || []).length < 2) report.error('missing-takeaways', 'At least two key takeaways are required', entry.file);
  else { score += 10; report.pass(); }

  if (entry.internalLinks.length === 0 && related.length === 0) report.error('missing-internal-links', 'No contextual or related internal links', entry.file);
  else { score += 15; report.pass(); }

  if (sources.length === 0) report.error('missing-sources', 'Published content has no sources', entry.file);
  else {
    score += 15;
    for (const source of sources) {
      try { new URL(source.url); report.pass(); } catch { report.error('invalid-source', `Invalid source URL: ${source.url}`, entry.file); }
    }
  }

  if (!entry.data.updated) report.error('missing-updated', 'Published content has no updated date', entry.file);
  else if (new Date(entry.data.updated) < new Date(entry.data.date)) report.error('invalid-updated', 'updated date is earlier than date', entry.file);
  else { score += 10; report.pass(); }

  if ((entry.data.faq || []).length > 0) score += 5;
  const topicSignals = [entry.data.category, ...(entry.data.entity || []), ...(entry.data.keywords || [])]
    .map(compactText)
    .filter((value) => value.length >= 2);
  if (!topicSignals.some((signal) => compactText(`${entry.data.title} ${entry.body}`).includes(signal))) {
    report.warn('title-body-mismatch', 'Title/topic terms are weakly represented in the body', entry.file);
  } else report.pass();

  if (/作为(一个|一名).*AI|在当今快速发展的|值得注意的是.{0,8}值得注意/i.test(entry.body)) {
    report.error('template-language', 'Body contains generic template language', entry.file);
  } else report.pass();
  if (/\n\s*\n\s*\n/.test(entry.body)) report.warn('empty-paragraphs', 'Body contains repeated empty paragraphs', entry.file);
  else report.pass();

  scores.push({ key: entry.key, score });
  if (!entry.data.noindex && score < 70) report.error('indexability-threshold', `Indexable content quality score is ${score}/100`, entry.file);
  else report.pass();
}

for (let left = 0; left < entries.length; left += 1) {
  for (let right = left + 1; right < entries.length; right += 1) {
    const value = similarity(entries[left].plain, entries[right].plain, 4);
    if (value >= 0.72) report.error('content-similarity', `${entries[left].key} and ${entries[right].key} are ${(value * 100).toFixed(1)}% similar`);
  }
}

for (const item of scores) console.log(`QUALITY ${String(item.score).padStart(3, ' ')}/100 ${item.key}`);
report.print();
