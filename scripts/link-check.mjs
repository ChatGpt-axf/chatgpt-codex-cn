import { getBuildMap, getHtmlPages, inspectLinks } from './lib/build-site.mjs';
import { AuditReport } from './lib/report.mjs';
import { loadSiteConfig } from './lib/content.mjs';
import { getProjectRootPath } from './lib/site-url.mjs';

const pages = getHtmlPages();
const projectRoot = getProjectRootPath(loadSiteConfig());
const report = new AuditReport('Internal Link Check Summary', pages.length);
const { broken, incoming } = inspectLinks(pages, getBuildMap());

for (const item of broken) report.error('broken-link', `${item.href} from ${item.from}: ${item.reason}`);

for (const page of pages) {
  const noindex = page.$('meta[name="robots"]').attr('content')?.toLowerCase().includes('noindex');
  if (!noindex && page.route !== projectRoot && (incoming.get(page.route) || 0) === 0) {
    report.error('orphan-page', 'Indexable HTML page has no incoming internal link', page.route);
  } else report.pass();
}

if (broken.length === 0) report.pass();
report.print();
