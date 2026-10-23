// Gera, para cada entidade do inventário, um "pacote de fontes" em texto (data/sources/<id>.md)
// contendo somente material de BOTW: fatos estruturados, texto do compendium, citações do jogo e
// extrato das seções de BOTW do Zelda Wiki. Esses pacotes são a base para redigir as fichas em PT-BR.
// Também grava data/inventory/wiki-extracts.json com parâmetros datamined e metadados das páginas.
import fs from 'node:fs';
import { readJson, writeJson, writeText, p, log, slugify } from '../lib/util.mjs';
import { extractBotW, botwRefs, infoboxBotW, pageGames, splitArgs } from '../lib/wikiclean.mjs';

const inv = readJson(p('data/inventory/inventory.json'));
const pagePath = (t) => p('data/raw/zeldawiki/pages', slugify(t) + '.json');
const loadPage = (t) => (fs.existsSync(pagePath(t)) ? readJson(pagePath(t)) : null);

/** Lê todos os templates "{{BotW ... Parameters" / "{{BotW Item Properties/Store" de uma página. */
function botwParamTemplates(wikitext) {
  const out = {};
  const re = /\{\{(BotW (?:Weapon|Shield|Bow|Elemental Weapon) Parameters|BotW Item Properties\/Store)/g;
  let m;
  while ((m = re.exec(wikitext))) {
    let depth = 0;
    let i = m.index;
    for (; i < wikitext.length - 1; i++) {
      if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
        depth++;
        i++;
      } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
        depth--;
        i++;
        if (depth === 0) break;
      }
    }
    const inner = wikitext.slice(m.index + 2, i - 1);
    const args = splitArgs(inner).slice(1);
    const obj = {};
    for (const a of args) {
      const kv = a.match(/^\s*([\w ]+?)\s*=\s*([\s\S]*?)\s*$/);
      if (!kv) continue;
      let v = kv[2].replace(/^"|"$/g, '');
      if (v === '') continue;
      if (/^(true|false)$/i.test(v)) v = v.toLowerCase() === 'true';
      else if (/^(yes|no)$/i.test(v)) v = v.toLowerCase() === 'yes';
      else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
      obj[kv[1].trim()] = v;
    }
    const key = m[1].replace(/^BotW /, '').replace(/\/Store$/, '').replace(/ /g, '_').toLowerCase();
    out[key] = obj;
  }
  return out;
}

function compactFacts(facts) {
  const f = structuredClone(facts);
  if (f.compendium) delete f.compendium.image;
  return f;
}

const extracts = {};
let empty = 0;
for (const e of inv) {
  const titles = [e.wiki_title, ...(e.facts.curated?.extra_wiki_titles ?? [])];
  const pages = titles.map(loadPage).filter(Boolean);
  const main = pages[0];
  const parts = [];
  parts.push(`# ${e.name_en}  \`${e.id}\``);
  parts.push(
    `- categoria: ${e.categories.join(', ')} / ${e.subcategory ?? '-'}\n- DLC: ${e.dlc ?? 'não'}\n- amiibo: ${e.amiibo ?? 'não'}` +
      (e.aliases_en.length ? `\n- outros nomes (EN): ${e.aliases_en.join('; ')}` : '') +
      (e.family ? `\n- família: ${e.family}` : '') +
      (e.variants.length ? `\n- variantes incorporadas: ${e.variants.map((v) => v.name_en).join('; ')}` : ''),
  );
  parts.push('## Fatos estruturados (fontes: Hyrule Compendium API, Zelda Wiki Cargo/tabelas)\n```json\n' +
    JSON.stringify(compactFacts(e.facts), null, 1) + '\n```');
  if (e.variants.length) parts.push('## Variantes\n' + e.variants.map((v) => `- ${v.name_en}: ${v.description ?? ''} ${v.obtained_from ? '(obtido em: ' + v.obtained_from + ')' : ''}`).join('\n'));

  const ex = { pages: [], params: {} };
  for (const pg of pages) {
    const games = pageGames(pg.wikitext);
    const botwOnly = games.length > 0 && games.every((g) => /BotW|Breath of the Wild/.test(g));
    const text = extractBotW(pg.wikitext, { botwOnlyPage: botwOnly });
    const refs = botwRefs(pg.wikitext);
    const infobox = infoboxBotW(pg.wikitext);
    const params = botwParamTemplates(pg.wikitext);
    Object.assign(ex.params, params);
    ex.pages.push({ title: pg.title, url: pg.url, revid: pg.revid, timestamp: pg.timestamp, botw_text_chars: text.length });
    if (pg === main) ex.infobox = infobox;
    parts.push(`## Zelda Wiki — ${pg.title}\nURL: ${pg.url} (revisão ${pg.revid}, ${pg.timestamp})\nJogos da página: ${games.join(', ') || '?'}`);
    if (Object.keys(infobox).length) parts.push('### Infobox (campos de BotW)\n' + Object.entries(infobox).map(([k, v]) => `- ${k}: ${v.replace(/\n/g, '; ')}`).join('\n'));
    if (Object.keys(params).length) parts.push('### Parâmetros datamined de BotW\n```json\n' + JSON.stringify(params, null, 1) + '\n```');
    parts.push('### Texto (somente seções de BotW)\n' + (text || '(sem texto específico de BotW nesta página)'));
    if (refs.length) parts.push('### Citações do jogo (referências BotW)\n' + refs.map((r) => `- [${r.name}] ${r.text}`).join('\n'));
  }
  if (!main) {
    parts.push('## Zelda Wiki\n(página não encontrada)');
    empty++;
  }
  extracts[e.id] = ex;
  writeText(p('data/sources', e.id + '.md'), parts.join('\n\n') + '\n');
}
writeJson(p('data/inventory/wiki-extracts.json'), extracts);

const sizes = Object.entries(extracts).map(([id, x]) => [id, x.pages.reduce((s, pg) => s + pg.botw_text_chars, 0)]);
const tiny = sizes.filter(([, n]) => n < 400).map(([id, n]) => `${id}(${n})`);
log(`pacotes de fontes: ${inv.length} (sem página: ${empty}); com pouco texto de BotW (<400 chars): ${tiny.length}`);
if (tiny.length) log(tiny.join(' '));
