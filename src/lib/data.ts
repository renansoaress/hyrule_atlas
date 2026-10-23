import atlasJson from '../generated/atlas.json';
import type { Atlas, Entity } from './types';

export const atlas = atlasJson as unknown as Atlas;
export const entities: Entity[] = atlas.entities;
export const byId = new Map(entities.map((e) => [e.id, e]));
export const categoryLabel = Object.fromEntries(atlas.categories.map((c) => [c.key, c.label]));

/** Remove acentos e caixa para busca tolerante (ex.: "geleca", "GELÉCA", "geleca de chulchul"). */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

interface Indexed {
  e: Entity;
  name: string; // nomes PT e EN (peso alto)
  body: string; // demais textos
}

const capLabels = atlas.vocab.capabilities;

export const index: Indexed[] = entities.map((e) => {
  const name = normalize([e.name_ptbr, e.name_en, ...e.aliases_en, ...e.variants.map((v) => v.name_ptbr + ' ' + v.name_en)].join(' '));
  const body = normalize(
    [
      e.category_label,
      e.subcategory_label ?? '',
      e.summary ?? '',
      e.description ?? '',
      ...e.effects,
      ...e.uses,
      ...e.locations,
      ...e.obtaining,
      ...e.capabilities.map((c) => capLabels[c] ?? c),
      ...e.interactions.map((i) => `${i.action_label} ${i.result}`),
      ...e.secrets.map((s) => `${s.title} ${s.text}`),
      ...e.advanced_uses,
      ...(e.armor_effects ?? []),
      ...(e.recipe ?? []).map((r) => r.text),
      ...e.stats.map((s) => `${s.label} ${s.value}`),
      e.compendium_text_en ?? '',
      e.game_text_en ?? '',
      e.dlc_label ?? '',
      e.amiibo ?? '',
    ].join(' '),
  );
  return { e, name, body };
});

/**
 * Busca por termos (todas as palavras precisam aparecer). Pontua mais quando aparecem no nome.
 * Devolve entidades ordenadas por relevância.
 */
export function search(query: string, pool: Entity[] = entities): Entity[] {
  const q = normalize(query);
  if (!q) return pool;
  const words = q.split(' ').filter(Boolean);
  const allowed = new Set(pool.map((e) => e.id));
  const scored: { e: Entity; s: number }[] = [];
  for (const it of index) {
    if (!allowed.has(it.e.id)) continue;
    let s = 0;
    let ok = true;
    for (const w of words) {
      const inName = it.name.includes(w);
      const inBody = !inName && it.body.includes(w);
      if (!inName && !inBody) {
        ok = false;
        break;
      }
      s += inName ? (it.name.startsWith(w) || it.name.includes(' ' + w) ? 12 : 8) : 1;
    }
    if (!ok) continue;
    if (it.name === q) s += 50;
    else if (it.name.startsWith(q)) s += 20;
    scored.push({ e: it.e, s });
  }
  return scored.sort((a, b) => b.s - a.s || a.e.name_ptbr.localeCompare(b.e.name_ptbr, 'pt')).map((x) => x.e);
}

declare global {
  interface Window {
    __ATLAS_IMG__?: Record<string, string>;
  }
}

/** Resolve o caminho de uma imagem: na versão de arquivo único, devolve o data URI embutido. */
export function img(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const embedded = typeof window !== 'undefined' ? window.__ATLAS_IMG__ : undefined;
  if (embedded) return embedded[path] ?? embedded[path.replace('/thumb/', '/main/')] ?? undefined;
  return path;
}
