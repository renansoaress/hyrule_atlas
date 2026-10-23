// Índice do cache local de páginas do Zelda Wiki: aceita tanto o título pesquisado quanto o título
// canônico (após redirecionamento) como chave "zw:Título".
import fs from 'node:fs';
import path from 'node:path';
import { p, slugify } from './util.mjs';

let index = null;
export function wikiCacheIndex() {
  if (index) return index;
  index = new Map();
  const dir = p('data/raw/zeldawiki/pages');
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const full = path.join(dir, f);
    index.set(f.replace(/\.json$/, ''), full);
    try {
      const head = fs.readFileSync(full, 'utf8').slice(0, 600);
      const t = head.match(/"title":\s*"((?:[^"\\]|\\.)*)"/)?.[1];
      if (t) {
        const slug = slugify(JSON.parse(`"${t}"`));
        if (!index.has(slug)) index.set(slug, full);
      }
    } catch {
      /* ignora arquivo ilegível */
    }
  }
  return index;
}

/** Caminho do arquivo em cache para um título (pesquisado ou canônico), ou null. */
export function wikiCacheFile(title) {
  return wikiCacheIndex().get(slugify(title)) ?? null;
}
