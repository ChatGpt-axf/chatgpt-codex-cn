import { parseArgs } from './lib/args.mjs';
import {
  printSubmissionResults,
  runSubmissions,
  SUBMITTABLE_ENGINES,
} from './lib/submission.mjs';

export async function runSearchSubmitCli({ forcedEngine } = {}) {
  const args = parseArgs();
  const requested = forcedEngine || (args.engine && args.engine !== true ? String(args.engine) : 'all');
  const ids = requested === 'all' ? SUBMITTABLE_ENGINES : [requested];
  const results = await runSubmissions(ids, args);
  printSubmissionResults(results, { preparing: Boolean(args['prepare-only'] || args['dry-run']) });
  if (results.some((result) => result.status === 'FAILED')) process.exitCode = 1;
  return results;
}

const entry = process.argv[1] ? new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href : '';
if (import.meta.url === entry) await runSearchSubmitCli();
