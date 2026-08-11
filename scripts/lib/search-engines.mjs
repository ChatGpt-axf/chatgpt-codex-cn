import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

export const ENGINE_IDS = ['google', 'bing', 'baidu', 'so360', 'sogou', 'shenma', 'ai'];

export function loadSearchEngineMatrix() {
  const file = path.resolve('data/search-engines.yaml');
  const parsed = loadYaml(fs.readFileSync(file, 'utf8'));
  if (!parsed || !Array.isArray(parsed.engines)) throw new Error('data/search-engines.yaml must contain an engines array.');
  const engines = new Map(parsed.engines.map((engine) => [engine.id, engine]));
  for (const id of ENGINE_IDS) if (!engines.has(id)) throw new Error(`Search engine matrix is missing: ${id}`);
  return engines;
}

export function getSearchSetting(config, id) {
  const setting = config.searchEngines?.[id];
  if (!setting) throw new Error(`Site search engine config is missing: ${id}`);
  return setting;
}

export function verificationConfigured(setting) {
  if (setting.verificationCode) return true;
  const verification = setting.verification || {};
  if (verification.method === 'meta') return Boolean(verification.metaName && verification.value);
  if (verification.method === 'html') return Boolean(verification.fileName && verification.fileContent);
  if (verification.method === 'dns') return Boolean(verification.dnsRecord);
  return false;
}

export function parseRobots(content) {
  const groups = [];
  let group = null;
  for (const sourceLine of content.split(/\r?\n/)) {
    const line = sourceLine.replace(/#.*$/, '').trim();
    if (!line || !line.includes(':')) continue;
    const separator = line.indexOf(':');
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === 'user-agent') {
      if (!group || group.rules.length > 0) {
        group = { agents: [], rules: [] };
        groups.push(group);
      }
      group.agents.push(value.toLowerCase());
    } else if (group && (key === 'allow' || key === 'disallow')) {
      group.rules.push({ type: key, path: value });
    }
  }
  return groups;
}

function robotsPathMatches(rulePath, pathname) {
  if (!rulePath) return false;
  const escaped = rulePath.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}`).test(pathname);
}

export function crawlerAllowed(content, crawler, pathname = '/') {
  const crawlerName = crawler.toLowerCase();
  const groups = parseRobots(content);
  const candidates = groups
    .map((group) => ({
      group,
      specificity: Math.max(...group.agents.map((agent) => agent === '*' ? 0 : crawlerName.includes(agent) ? agent.length : -1)),
    }))
    .filter((item) => item.specificity >= 0);
  if (candidates.length === 0) return true;
  const best = Math.max(...candidates.map((item) => item.specificity));
  const rules = candidates.filter((item) => item.specificity === best).flatMap((item) => item.group.rules);
  const matching = rules.filter((rule) => robotsPathMatches(rule.path, pathname));
  if (matching.length === 0) return true;
  const longest = Math.max(...matching.map((rule) => rule.path.length));
  return matching.filter((rule) => rule.path.length === longest).some((rule) => rule.type === 'allow');
}

export function engineReportFile(id) {
  return `${id === 'so360' ? '360' : id}-readiness.json`;
}

export function submissionFile(id) {
  return `${id === 'so360' ? '360' : id}-submit-urls.txt`;
}
