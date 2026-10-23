// Valida fichas redigidas em data/content/*.json.
// Uso: node scripts/validate/content.mjs [arquivos ou ids...]   (sem argumentos = todas)
//      --quiet  mostra apenas erros
import fs from 'node:fs';
import path from 'node:path';
import { readJson, p, listFiles, slugify } from '../lib/util.mjs';
import { validateContent, expectedActionsFor } from '../lib/schema.mjs';
import { wikiCacheFile } from '../lib/wikicache.mjs';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const inv = readJson(p('data/inventory/inventory.json'));
const ids = new Set(inv.map((e) => e.id));
const byId = new Map(inv.map((e) => [e.id, e]));
let files = args.filter((a) => !a.startsWith('--'));
if (!files.length) files = listFiles(p('data/content'), '.json');
files = files.map((f) => (fs.existsSync(f) ? f : p('data/content', f.replace(/\.json$/, '') + '.json')));

let nErr = 0;
let nWarn = 0;
for (const f of files) {
  let c;
  try {
    c = JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    console.log(`✗ ${path.basename(f)}: JSON inválido — ${e.message}`);
    nErr++;
    continue;
  }
  if (path.basename(f, '.json') !== c.id) console.log(`✗ ${path.basename(f)}: nome do arquivo difere do id ${c.id}`);
  const entity = byId.get(c.id);
  const { errors, warnings } = validateContent(c, { ids, entity, expectedActions: entity ? expectedActionsFor(entity) : [] });
  // toda página "zw:Título" citada precisa estar no cache local (rastreabilidade)
  const keys = new Set();
  for (const it of c.interactions ?? []) for (const s of it.sources ?? []) keys.add(s);
  for (const s of c.secrets ?? []) for (const k of s.sources ?? []) keys.add(k);
  for (const k of keys) {
    if (!k.startsWith('zw:')) continue;
    const title = k.slice(3);
    if (!wikiCacheFile(title))
      errors.push(`fonte ${k} não está no cache — rode: node scripts/tools/wiki-botw.mjs "${title}"`);
  }
  nErr += errors.length;
  nWarn += warnings.length;
  if (errors.length || (!quiet && warnings.length)) {
    console.log(`${errors.length ? '✗' : '!'} ${c.id}`);
    for (const e of errors) console.log('   erro:  ' + e);
    if (!quiet) for (const w of warnings) console.log('   aviso: ' + w);
  }
}
console.log(`\n${files.length} fichas verificadas — ${nErr} erros, ${nWarn} avisos`);
process.exit(nErr ? 1 : 0);
