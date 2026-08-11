import { runSearchAudit } from './lib/search-audit.mjs';

const reports = await runSearchAudit();
console.log(`Generated reports/search-engine-report.json and .md for ${reports.length} engines.`);
if (reports.some((report) => report.status === 'ERROR')) process.exitCode = 1;
