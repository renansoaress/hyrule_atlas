// Baixa o wikitext de páginas do Zelda Wiki (texto sob GNU FDL 1.3) em lotes de 50 títulos.
// Uso:
//   node scripts/import/zeldawiki-pages.mjs                  -> títulos de data/inventory/wiki-titles.json
//   node scripts/import/zeldawiki-pages.mjs "Fire" "Flint"   -> títulos avulsos
//   --force  rebaixa mesmo páginas já presentes em cache
// Saída: data/raw/zeldawiki/pages/<slug>.json  { requested, title, revid, timestamp, wikitext }
import fs from 'node:fs';
import { fetchJson, readJson, writeJson, p, log, slugify, sleep } from '../lib/util.mjs';

const API = 'https://zeldawiki.wiki/w/api.php';
const args = process.argv.slice(2);
const force = args.includes('--force');
let titles = args.filter((a) => !a.startsWith('--'));
if (!titles.length) titles = readJson(p('data/inventory/wiki-titles.json'));
titles = [...new Set(titles)];

export const pageFile = (title) => p('data/raw/zeldawiki/pages', slugify(title) + '.json');

const todo = force ? titles : titles.filter((t) => !fs.existsSync(pageFile(t)));
log(`zeldawiki pages: ${titles.length} títulos, ${todo.length} a baixar`);

const missing = [];
for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50);
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'revisions',
    rvprop: 'content|ids|timestamp',
    rvslots: 'main',
    redirects: '1',
    titles: batch.join('|'),
  });
  const data = await fetchJson(`${API}?${params}`);
  // mapa requested -> título canônico (normalização + redirecionamentos)
  const resolve = new Map(batch.map((t) => [t, t]));
  for (const n of data.query.normalized ?? []) for (const [k, v] of resolve) if (v === n.from) resolve.set(k, n.to);
  for (const r of data.query.redirects ?? []) for (const [k, v] of resolve) if (v === r.from) resolve.set(k, r.to);
  const byTitle = new Map(data.query.pages.map((pg) => [pg.title, pg]));
  for (const [requested, canonical] of resolve) {
    const pg = byTitle.get(canonical);
    if (!pg || pg.missing || !pg.revisions) {
      missing.push(requested);
      continue;
    }
    const rev = pg.revisions[0];
    writeJson(pageFile(requested), {
      requested,
      title: pg.title,
      url: `https://zeldawiki.wiki/wiki/${encodeURIComponent(pg.title.replace(/ /g, '_'))}`,
      revid: rev.revid,
      timestamp: rev.timestamp,
      license: 'GNU FDL 1.3 (Zelda Wiki)',
      wikitext: rev.slots.main.content,
    });
  }
  log(`  lote ${i / 50 + 1}: ${batch.length} títulos`);
  await sleep(400);
}

const missFile = p('data/raw/zeldawiki/pages-missing.json');
const prev = readJson(missFile, []);
const allMissing = [...new Set([...prev.filter((t) => !fs.existsSync(pageFile(t))), ...missing])];
writeJson(missFile, allMissing);
log(`zeldawiki pages: ${missing.length} títulos inexistentes neste lote (ver pages-missing.json)`);
