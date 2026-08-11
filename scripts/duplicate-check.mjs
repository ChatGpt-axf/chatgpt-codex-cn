import { jaccard, normalizeText, readContent, similarity } from './lib/content.mjs';
import { AuditReport } from './lib/report.mjs';

const entries = readContent({ includeDrafts: false });
const report = new AuditReport('Duplicate Content Check Summary', entries.length);
const exactTitles = new Map();
const exactDescriptions = new Map();

function remember(map, value, entry) {
  const key = normalizeText(value);
  const owners = map.get(key) || [];
  owners.push(entry);
  map.set(key, owners);
}

for (const entry of entries) {
  remember(exactTitles, entry.data.title, entry);
  remember(exactDescriptions, entry.data.description, entry);
}
for (const owners of exactTitles.values()) if (owners.length > 1) report.error('exact-title', `Exact duplicate title: ${owners.map((entry) => entry.key).join(', ')}`);
for (const owners of exactDescriptions.values()) if (owners.length > 1) report.error('exact-description', `Exact duplicate description: ${owners.map((entry) => entry.key).join(', ')}`);

for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
    const left = entries[leftIndex];
    const right = entries[rightIndex];
    const titleScore = similarity(left.data.title, right.data.title, 2);
    const bodyScore = similarity(left.plain, right.plain, 4);
    const keywordScore = jaccard(
      new Set((left.data.keywords || []).map(normalizeText)),
      new Set((right.data.keywords || []).map(normalizeText)),
    );
    const sharedKeywords = (left.data.keywords || []).filter((item) => (right.data.keywords || []).map(normalizeText).includes(normalizeText(item)));

    if (titleScore >= 0.78) report.warn('similar-title', `${left.key} and ${right.key}: ${(titleScore * 100).toFixed(1)}%`);
    else report.pass();
    if (bodyScore >= 0.72) report.error('similar-body', `${left.key} and ${right.key}: ${(bodyScore * 100).toFixed(1)}% body similarity`);
    else if (bodyScore >= 0.55) report.warn('body-overlap', `${left.key} and ${right.key}: ${(bodyScore * 100).toFixed(1)}% body similarity`);
    else report.pass();
    if (sharedKeywords.length >= 3 && keywordScore >= 0.75) report.warn('keyword-overlap', `${left.key} and ${right.key}: ${(keywordScore * 100).toFixed(1)}% keyword overlap`);
    else report.pass();
  }
}

report.print();
