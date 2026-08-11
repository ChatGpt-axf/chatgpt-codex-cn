import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { load as loadYaml } from 'js-yaml';

export interface Entity {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  officialUrl: string;
  type: string;
  relatedEntities: string[];
}

export function getEntities(): Entity[] {
  return fg.sync('data/entities/*.{yaml,yml}')
    .map((file) => {
      const data = loadYaml(fs.readFileSync(file, 'utf8')) as Omit<Entity, 'id'> & { id?: string };
      return {
        ...data,
        id: data.id || path.basename(file, path.extname(file)),
        aliases: data.aliases || [],
        relatedEntities: data.relatedEntities || [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
