// Ferramenta de pesquisa: imprime somente o conteúdo de BOTW de páginas do Zelda Wiki.
// Baixa e guarda em cache (data/raw/zeldawiki/pages) as páginas que ainda não existem localmente.
// Uso: node scripts/tools/wiki-botw.mjs "Fire" "Updraft" [--raw]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readJson, p, slugify } from '../lib/util.mjs';
import { extractBotW, botwRefs, infoboxBotW, pageGames } from '../lib/wikiclean.mjs';

const args = process.argv.slice(2);
const raw = args.includes('--raw');
const titles = args.filter((a) => !a.startsWith('--'));
if (!titles.length) {
  console.error('uso: node scripts/tools/wiki-botw.mjs "Título da página" [...]');
  process.exit(1);
}
const file = (t) => p('data/raw/zeldawiki/pages', slugify(t) + '.json');
const missing = titles.filter((t) => !fs.existsSync(file(t)));
if (missing.length) {
  execFileSync(process.execPath, [p('scripts/import/zeldawiki-pages.mjs'), ...missing], { stdio: 'ignore' });
}
for (const t of titles) {
  if (!fs.existsSync(file(t))) {
    console.log(`# ${t}\n(página inexistente no Zelda Wiki)\n`);
    continue;
  }
  const pg = readJson(file(t));
  console.log(`# ${pg.title}\nURL: ${pg.url}\nChave de fonte: zw:${t}${pg.title !== t ? ` (equivalente: zw:${pg.title})` : ''}`);
  if (raw) {
    console.log(pg.wikitext);
    continue;
  }
  const games = pageGames(pg.wikitext);
  const botwOnly = games.length > 0 && games.every((g) => /BotW|Breath of the Wild/.test(g));
  const ib = infoboxBotW(pg.wikitext);
  if (Object.keys(ib).length) console.log('\n## Infobox\n' + Object.entries(ib).map(([k, v]) => `- ${k}: ${v.replace(/\n/g, '; ')}`).join('\n'));
  console.log('\n## Texto de BOTW\n' + (extractBotW(pg.wikitext, { botwOnlyPage: botwOnly }) || '(sem seção de BOTW)'));
  const refs = botwRefs(pg.wikitext);
  if (refs.length) console.log('\n## Citações do jogo\n' + refs.map((r) => `- ${r.text}`).join('\n'));
  console.log('');
}
