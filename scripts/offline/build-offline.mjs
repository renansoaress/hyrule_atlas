// Gera a distribuição offline a partir de dist/ (saída do Vite):
//   release/Hyrule-Atlas-Offline/            pasta com index.html + assets (melhor desempenho)
//   release/Hyrule-Atlas-Offline.zip         a mesma pasta compactada
//   release/Hyrule-Atlas-Offline.html        arquivo ÚNICO: CSS, JS, dados, fonte e imagens embutidos
// Nenhuma versão depende de rede: o script é IIFE clássico (módulos ES são bloqueados em file://),
// todos os caminhos são relativos e as imagens do arquivo único são data URIs.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { p, log, listFiles, pool } from '../lib/util.mjs';

const DIST = p('dist');
const REL = p('release');
const FOLDER = path.join(REL, 'Hyrule-Atlas-Offline');
const SINGLE = path.join(REL, 'Hyrule-Atlas-Offline.html');
const CACHE = p('build-cache', 'single');

if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/ não existe — rode o build web antes.');

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const scriptTag = html.match(/<script[^>]*src="\.\/assets\/app\.js"[^>]*><\/script>/)?.[0];
const cssTag = html.match(/<link[^>]*href="\.\/assets\/style\.css"[^>]*>/)?.[0];
if (!scriptTag || !cssTag) throw new Error('index.html inesperado: não achei app.js/style.css');

// ---------------------------------------------------------------- 1. pasta
fs.rmSync(FOLDER, { recursive: true, force: true });
fs.mkdirSync(FOLDER, { recursive: true });
const folderHtml = html
  .replace(scriptTag, '')
  .replace(cssTag, '<link rel="stylesheet" href="./assets/style.css">')
  .replace('</body>', '    <script defer src="./assets/app.js"></script>\n  </body>');
fs.writeFileSync(path.join(FOLDER, 'index.html'), folderHtml);
for (const f of listFiles(path.join(DIST, 'assets'))) {
  const rel = path.relative(DIST, f);
  fs.mkdirSync(path.dirname(path.join(FOLDER, rel)), { recursive: true });
  fs.copyFileSync(f, path.join(FOLDER, rel));
}
fs.writeFileSync(
  path.join(FOLDER, 'LEIA-ME.txt'),
  [
    'Hyrule Atlas — versão offline em pasta',
    '',
    'Abra o arquivo index.html com um navegador moderno (Chrome, Edge, Firefox).',
    'Não é preciso internet nem servidor: tudo (dados, imagens e fonte) está nesta pasta.',
    '',
    'Favoritos e preferências ficam salvos no próprio navegador (localStorage).',
    'Imagens e textos do jogo: © Nintendo. Projeto de fã, sem fins comerciais.',
    '',
  ].join('\r\n'),
);
log(`pasta offline: ${listFiles(FOLDER).length} arquivos`);

// ---------------------------------------------------------------- 2. ZIP
const zipInput = {};
for (const f of listFiles(FOLDER)) {
  const rel = 'Hyrule-Atlas-Offline/' + path.relative(FOLDER, f).replace(/\\/g, '/');
  const data = fs.readFileSync(f);
  zipInput[rel] = [data, { level: /\.(webp|png|jpg)$/i.test(f) ? 0 : 6 }];
}
fs.writeFileSync(path.join(REL, 'Hyrule-Atlas-Offline.zip'), zipSync(zipInput));
log(`zip: ${(fs.statSync(path.join(REL, 'Hyrule-Atlas-Offline.zip')).size / 1048576).toFixed(1)} MB`);

// ---------------------------------------------------------------- 3. arquivo único
// Reencoda as imagens com tamanhos menores para manter o HTML único num tamanho razoável.
const PROFILES = { main: [256, 74], icon: [128, 78], dye: [80, 72], extra: [300, 66] };
const imgRoot = path.join(DIST, 'assets', 'img');
const entries = [];
for (const [dir, [size, q]] of Object.entries(PROFILES)) {
  for (const f of listFiles(path.join(imgRoot, dir), '.webp')) entries.push({ f, dir, size, q });
}
const map = {};
await pool(entries, 8, async ({ f, dir, size, q }) => {
  const key = 'assets/img/' + dir + '/' + path.basename(f);
  const cached = path.join(CACHE, dir, path.basename(f));
  if (!fs.existsSync(cached) || fs.statSync(cached).mtimeMs < fs.statSync(f).mtimeMs) {
    fs.mkdirSync(path.dirname(cached), { recursive: true });
    await sharp(f).resize(size, size, { fit: 'inside', withoutEnlargement: true }).webp({ quality: q, alphaQuality: 85, effort: 5 }).toFile(cached);
  }
  map[key] = 'data:image/webp;base64,' + fs.readFileSync(cached).toString('base64');
});

const css = fs.readFileSync(path.join(DIST, 'assets', 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(DIST, 'assets', 'app.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const imgJson = JSON.stringify(map).replace(/<\//g, '<\\/');
const single = html
  .replace(scriptTag, '')
  .replace(cssTag, `<style>\n${css}\n</style>`)
  .replace(
    '</body>',
    `    <script>window.__ATLAS_IMG__=JSON.parse(${JSON.stringify(imgJson)});</script>\n    <script>\n${js}\n</script>\n  </body>`,
  );
fs.writeFileSync(SINGLE, single);
const mb = (fs.statSync(SINGLE).size / 1048576).toFixed(1);
log(`arquivo único: ${SINGLE} (${mb} MB, ${Object.keys(map).length} imagens embutidas)`);

// verificação rápida: nada remoto exigido
const remote = [...single.matchAll(/(?:src|href)\s*=\s*["'](https?:)?\/\/[^"']+["']/gi)].map((m) => m[0]);
const linksOnly = remote.filter((r) => !/^href/i.test(r));
if (linksOnly.length) throw new Error('Recursos remotos encontrados no HTML único: ' + linksOnly.slice(0, 5).join(', '));
