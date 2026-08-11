import { findReference, readContent, relatedScore } from './lib/content.mjs';
import { AuditReport } from './lib/report.mjs';

const entries = readContent({ includeDrafts: false });
const report = new AuditReport('Internal Linking Suggestions', entries.length);
const incoming = new Map(entries.map((entry) => [entry.key, 0]));

for (const entry of entries) {
  for (const reference of entry.data.related || []) {
    const target = findReference(entries, reference);
    if (!target) report.error('invalid-related', `Related reference does not exist: ${reference}`, entry.file);
    else incoming.set(target.key, incoming.get(target.key) + 1);
  }
  for (const url of entry.internalLinks) {
    const target = entries.find((candidate) => candidate.url === url);
    if (target) incoming.set(target.key, incoming.get(target.key) + 1);
  }
  if (entry.data.parent) {
    const parent = entries.find((candidate) => candidate.slug === entry.data.parent && candidate.data.pillar);
    if (!parent) report.error('invalid-parent', `Pillar parent not found: ${entry.data.parent}`, entry.file);
    else report.pass();
  }

  const linked = new Set(entry.data.related || []);
  const suggestions = entries
    .map((candidate) => ({ candidate, score: relatedScore(entry, candidate) }))
    .filter(({ candidate, score }) => score > 0 && !linked.has(candidate.key) && !linked.has(candidate.slug))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  console.log(`\n${entry.key}`);
  if (suggestions.length === 0) console.log('  No additional suggestions.');
  for (const { candidate, score } of suggestions) console.log(`  -> ${candidate.key} (relevance ${score})`);
}

for (const entry of entries) {
  if ((incoming.get(entry.key) || 0) === 0) report.error('orphan-content', 'Content has no incoming contextual or related link', entry.file);
  else report.pass();
  if (entry.data.pillar && !entries.some((candidate) => candidate.data.parent === entry.slug)) {
    report.warn('pillar-without-cluster', 'Pillar has no cluster children', entry.file);
  }
}

report.print();
