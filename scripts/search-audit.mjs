import { runSearchAudit } from './lib/search-audit.mjs';

const reports = await runSearchAudit();
console.log('\nSEARCH ENGINE READINESS');
for (const report of reports) {
  console.log(`${report.engine}: ${report.status} (${report.errors.length} errors, ${report.warnings.length} warnings)`);
  for (const error of report.errors) console.error(`  ERROR ${error}`);
  for (const warning of report.warnings) console.warn(`  WARN  ${warning}`);
}
if (reports.some((report) => report.status === 'ERROR')) process.exitCode = 1;
