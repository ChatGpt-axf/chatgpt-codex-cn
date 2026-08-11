function addBase(value: string, base: string): string {
  if (!value.startsWith('/') || base === '/' || value === base || value.startsWith(`${base}/`)) return value;
  return `${base}${value}`;
}

function walk(node: any, base: string): void {
  if (node?.type === 'element' && node.properties) {
    for (const property of ['href', 'src', 'poster']) {
      if (typeof node.properties[property] === 'string') node.properties[property] = addBase(node.properties[property], base);
    }
    if (typeof node.properties.srcSet === 'string') {
      node.properties.srcSet = node.properties.srcSet
        .split(',')
        .map((candidate: string) => {
          const [url, descriptor] = candidate.trim().split(/\s+/, 2);
          return `${addBase(url || '', base)}${descriptor ? ` ${descriptor}` : ''}`;
        })
        .join(', ');
    }
  }
  if (Array.isArray(node?.children)) for (const child of node.children) walk(child, base);
}

export function basePathLinks({ base }: { base: string }) {
  return (tree: any) => walk(tree, base);
}
