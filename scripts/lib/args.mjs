export function parseArgs(argv = process.argv.slice(2)) {
  const result = { _: [] };
  for (const token of argv) {
    if (!token.startsWith('--')) {
      result._.push(token);
      continue;
    }
    const [rawKey, ...parts] = token.slice(2).split('=');
    result[rawKey] = parts.length > 0 ? parts.join('=') : true;
  }
  return result;
}

export function assertSafeId(value, label) {
  if (!value || !/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`${label} must contain lowercase letters, numbers, and hyphens only.`);
  }
  return value;
}
