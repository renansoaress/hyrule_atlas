// Converte as imagens originais (data/raw/images) em WebP otimizados para o site:
//   public/assets/img/main/<id>.webp    imagem principal (até 320 px)
//   public/assets/img/thumb/<id>.webp   miniatura dos cartões (160 px)
//   public/assets/img/icon/<id>.webp    ícone de inventário, quando a principal é a foto do compendium
//   public/assets/img/dye/<id>__<cor>.webp  variantes de tingimento (96 px)
//   public/assets/img/extra/<id>__<papel>.webp  modelos, capturas e artes (até 360 px)
// Prioridade da imagem principal: foto do compendium > ícone de inventário > modelo > render > arte > captura.
// Conjuntos de armadura sem imagem própria recebem uma composição dos ícones oficiais das peças.
// Saída adicional: data/inventory/images.json (o que o build de dados consome).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { readJson, writeJson, p, log, pool, normKey } from '../lib/util.mjs';

const inv = readJson(p('data/inventory/inventory.json'));
const manifest = readJson(p('data/inventory/images-manifest.json'));
const OUT = p('public/assets/img');
const force = process.argv.includes('--force');
const PRIORITY = ['compendium', 'icon', 'model', 'render', 'artwork', 'concept_artwork', 'screenshot'];
const ROLE_PT = {
  compendium: 'Foto do Hyrule Compendium',
  icon: 'Ícone de inventário',
  model: 'Modelo 3D do jogo',
  render: 'Render oficial',
  artwork: 'Arte oficial',
  concept_artwork: 'Arte conceitual oficial',
  screenshot: 'Captura do jogo',
  dye: 'Variante de tingimento',
  composicao: 'Composição dos ícones oficiais das peças',
};

async function toWebp(src, dest, size, quality) {
  if (!force && fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(src)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality, alphaQuality: 90, effort: 5 })
    .toFile(dest);
}

const rel = (f) => path.relative(p('public'), f).replace(/\\/g, '/');
const byName = new Map(inv.map((e) => [normKey(e.name_en), e]));
const result = {};
const tasks = [];

for (const e of inv) {
  const imgs = manifest[e.id] ?? [];
  const sorted = imgs.filter((x) => x.role !== 'dye').sort((a, b) => PRIORITY.indexOf(a.role) - PRIORITY.indexOf(b.role));
  const entry = { main: null, thumb: null, icon: null, gallery: [], dyes: [], credits: [] };
  const primary = sorted[0];
  if (primary) {
    const main = path.join(OUT, 'main', e.id + '.webp');
    const thumb = path.join(OUT, 'thumb', e.id + '.webp');
    tasks.push(() => toWebp(p(primary.file), main, 320, 80), () => toWebp(p(primary.file), thumb, 160, 72));
    entry.main = rel(main);
    entry.thumb = rel(thumb);
    entry.main_role = primary.role;
    entry.credits.push({ ...primary, file: undefined, used_as: 'principal', role_pt: ROLE_PT[primary.role] });
  }
  for (const x of sorted.slice(1)) {
    if (x.role === 'icon') {
      const icon = path.join(OUT, 'icon', e.id + '.webp');
      tasks.push(() => toWebp(p(x.file), icon, 144, 82));
      entry.icon = rel(icon);
      entry.gallery.push({ src: rel(icon), role: 'icon', caption: ROLE_PT.icon });
    } else {
      const extra = path.join(OUT, 'extra', `${e.id}__${x.role}.webp`);
      tasks.push(() => toWebp(p(x.file), extra, 360, 76));
      entry.gallery.push({ src: rel(extra), role: x.role, caption: ROLE_PT[x.role] ?? x.role });
    }
    entry.credits.push({ ...x, file: undefined, used_as: 'galeria', role_pt: ROLE_PT[x.role] ?? x.role });
  }
  for (const d of imgs.filter((x) => x.role === 'dye')) {
    const dest = path.join(OUT, 'dye', `${e.id}__${path.basename(d.file).split('__')[1].replace(/\.\w+$/, '')}.webp`);
    tasks.push(() => toWebp(p(d.file), dest, 96, 78));
    entry.dyes.push({ src: rel(dest), color: d.color, color_pt: d.color_pt });
    entry.credits.push({ ...d, file: undefined, used_as: 'tingimento', role_pt: ROLE_PT.dye });
  }
  result[e.id] = entry;
}

// composição para conjuntos de armadura
for (const e of inv.filter((x) => x.type === 'armor_set')) {
  const members = (e.facts.armor_set?.members ?? []).map((n) => byName.get(normKey(n))).filter(Boolean);
  const icons = members.map((m) => (manifest[m.id] ?? []).find((x) => x.role === 'icon')).filter(Boolean);
  if (!icons.length) continue;
  const entry = result[e.id];
  const dest = path.join(OUT, 'main', e.id + '.webp');
  const thumb = path.join(OUT, 'thumb', e.id + '.webp');
  const hasOwn = entry.main && entry.main_role !== 'composicao';
  if (hasOwn) {
    // mantém a imagem própria como galeria e usa a composição como principal (mostra as peças)
    entry.gallery.unshift({ src: entry.main.replace('/main/', '/extra/').replace('.webp', '__own.webp'), role: entry.main_role, caption: ROLE_PT[entry.main_role] });
    const ownSrc = (manifest[e.id] ?? []).find((x) => x.role === entry.main_role);
    tasks.push(() => toWebp(p(ownSrc.file), path.join(OUT, 'extra', e.id + '__own.webp'), 360, 76));
    entry.credits = entry.credits.map((c) => (c.used_as === 'principal' ? { ...c, used_as: 'galeria' } : c));
  }
  tasks.push(async () => {
    if (!force && fs.existsSync(dest) && fs.existsSync(thumb) && !hasOwn) return;
    const tiles = await Promise.all(icons.map((ic) => sharp(p(ic.file)).resize(144, 144, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()));
    const canvas = sharp({ create: { width: 144 * tiles.length, height: 144, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(tiles.map((t, i) => ({ input: t, left: i * 144, top: 0 })))
      .png();
    const buf = await canvas.toBuffer();
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await sharp(buf).resize(320, 320, { fit: 'inside' }).webp({ quality: 80 }).toFile(dest);
    await sharp(buf).resize(160, 160, { fit: 'inside' }).webp({ quality: 72 }).toFile(thumb);
  });
  entry.main = rel(dest);
  entry.thumb = rel(thumb);
  entry.main_role = 'composicao';
  entry.credits.unshift({
    role: 'composicao',
    used_as: 'principal',
    role_pt: ROLE_PT.composicao,
    credit: 'Montagem automática do Hyrule Atlas com os ícones de inventário das peças (Zelda Wiki)',
    license: 'Copyright © Nintendo (ícones originais)',
    rights_holder: 'Nintendo',
    source_url: icons.map((i) => i.source_url).join(' | '),
    page_url: icons.map((i) => i.page_url).join(' | '),
  });
}

await pool(tasks, 8, (t) => t());
writeJson(p('data/inventory/images.json'), result);

let bytes = 0;
let files = 0;
const walk = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, f.name);
    if (f.isDirectory()) walk(full);
    else {
      bytes += fs.statSync(full).size;
      files++;
    }
  }
};
walk(OUT);
const missing = inv.filter((e) => !result[e.id]?.main).map((e) => e.id);
log(`imagens otimizadas: ${files} arquivos, ${(bytes / 1048576).toFixed(1)} MB; entidades sem imagem principal: ${missing.length}`);
