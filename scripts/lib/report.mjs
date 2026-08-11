export class AuditReport {
  constructor(name, total = 0) {
    this.name = name;
    this.total = total;
    this.errors = [];
    this.warnings = [];
    this.passed = 0;
  }

  error(code, message, file = '') {
    this.errors.push({ code, message, file });
  }

  warn(code, message, file = '') {
    this.warnings.push({ code, message, file });
  }

  pass(count = 1) {
    this.passed += count;
  }

  print() {
    for (const issue of this.errors) console.error(`ERROR [${issue.code}] ${issue.message}${issue.file ? ` (${issue.file})` : ''}`);
    for (const issue of this.warnings) console.warn(`WARN  [${issue.code}] ${issue.message}${issue.file ? ` (${issue.file})` : ''}`);
    console.log(`\n${this.name}`);
    console.log(`Total pages: ${this.total}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    console.log(`Passed: ${this.passed}`);
    if (this.errors.length > 0) process.exitCode = 1;
  }
}
