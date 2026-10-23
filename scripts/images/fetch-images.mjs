// Coleta as imagens reais de cada entidade e registra origem, autoria e licença.
//   - Foto do Hyrule Compendium (imagem oficial do jogo) via Hyrule Compendium API
//   - Ícone de inventário e outras mídias de BOTW listadas no infobox do Zelda Wiki
//   - Variantes de tingimento das armaduras (ícones "BotW <peça> <Cor> Icon.png")
// Todas as imagens são © Nintendo. O Zelda Wiki as publica sob alegação de uso justo (licensing = "Copyright");
// o Hyrule Atlas as usa da mesma forma: referência pessoal, educacional e não comercial (ver reports/fontes-e-creditos.md).
// Saídas: data/raw/images/** (originais) e data/inventory/images-manifest.json
import fs from 'node:fs';
import path from 'node:path';
import { readJson, writeJson, p, log, slugify, fetchJson, fetchRetry, pool, sleep } from '../lib/util.mjs';

const API = 'https://zeldawiki.wiki/w/api.php';
const inv = readJson(p('data/inventory/inventory.json'));
const curated = readJson(p('data/inventory/curated.json'));
const filesMeta = new Map(readJson(p('data/raw/zeldawiki/files.json')).rows.map((r) => [r.page, r]));
const pageOf = (t) => {
  const f = p('data/raw/zeldawiki/pages', slugify(t) + '.json');
  return fs.existsSync(f) ? readJson(f) : null;
};

const DYE_COLORS = ['Blue', 'Red', 'Yellow', 'White', 'Black', 'Purple', 'Green', 'Light Blue', 'Navy', 'Orange', 'Peach', 'Crimson', 'Light Yellow', 'Brown', 'Gray'];
const DYE_PT = {
  Blue: 'Azul', Red: 'Vermelho', Yellow: 'Amarelo', White: 'Branco', Black: 'Preto', Purple: 'Roxo', Green: 'Verde',
  'Light Blue': 'Azul-claro', Navy: 'Azul-marinho', Orange: 'Laranja', Peach: 'Pêssego', Crimson: 'Carmim',
  'Light Yellow': 'Amarelo-claro', Brown: 'Marrom', Gray: 'Cinza',
};

/** Lê as mídias de BOTW do infobox: [{kind, file}] */
function infoboxMedia(wikitext) {
  const out = [];
  const re = /\|\s*([A-Za-z][A-Za-z ]*?) BotW(?: (\d+))?\s*=\s*(\{\{Please Upload\|)?\s*(?:\[\[)?\s*(File:[^|\]\n}]+)/g;
  let m;
  while ((m = re.exec(wikitext))) {
    if (m[3]) continue; // arquivo ainda não enviado ao wiki
    out.push({ kind: m[1].trim().toLowerCase(), n: m[2] ? Number(m[2]) : 1, file: m[4].trim().replace(/_/g, ' ') });
  }
  return out;
}

// ---- monta a lista de candidatos por entidade
const wanted = new Map(); // fileTitle -> {ids:[], roles}
const plan = [];
for (const e of inv) {
  const cands = [];
  const c = e.facts.compendium;
  // entradas do Modo Mestre só respondem pelo número (o slug devolve 404)
  // as entradas do Modo Mestre na API devolvem imagens trocadas; usamos as fotos do compendium hospedadas no Zelda Wiki
  const compUrl = c?.master_mode ? null : c?.image;
  if (compUrl) cands.push({ role: 'compendium', url: compUrl });
  for (const o of curated.image_overrides?.[e.name_en] ?? []) cands.push({ ...o });
  const pg = pageOf(e.wiki_title);
  const media = pg ? infoboxMedia(pg.wikitext) : [];
  const pick = (kinds) => media.filter((x) => kinds.includes(x.kind));
  const icon = pick(['sprite', 'icon'])[0]?.file ?? `File:BotW ${e.name_en.replace(/:/g, '')} Icon.png`;
  cands.push({ role: 'icon', file: icon });
  // fallback consistente com a convenção de nomes do wiki, caso o infobox aponte outra coisa
  const conv = `File:BotW ${e.name_en.replace(/:/g, '')} Icon.png`;
  if (conv !== icon) cands.push({ role: 'icon_alt', file: conv });
  for (const x of pick(['model', 'render', 'artwork', 'screenshot', 'concept artwork']).slice(0, 2))
    cands.push({ role: x.kind.replace(' ', '_'), file: x.file });
  if (e.type === 'armor') {
    for (const color of DYE_COLORS) cands.push({ role: 'dye', color, color_pt: DYE_PT[color], file: `File:BotW ${e.name_en} ${color} Icon.png` });
  }
  for (const cand of cands) if (cand.file) {
    if (!wanted.has(cand.file)) wanted.set(cand.file, null);
  }
  plan.push({ id: e.id, cands });
}

// ---- resolve títulos de arquivos do wiki -> URL
const titles = [...wanted.keys()];
log(`imagens: ${titles.length} arquivos candidatos no Zelda Wiki`);
for (let i = 0; i < titles.length; i += 50) {
  const batch = titles.slice(i, i + 50);
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url|size|mime',
    redirects: '1',
    titles: batch.join('|'),
  });
  const data = await fetchJson(`${API}?${params}`);
  const norm = new Map(batch.map((t) => [t, t]));
  for (const n of data.query.normalized ?? []) for (const [k, v] of norm) if (v === n.from) norm.set(k, n.to);
  for (const r of data.query.redirects ?? []) for (const [k, v] of norm) if (v === r.from) norm.set(k, r.to);
  const byTitle = new Map(data.query.pages.map((pg) => [pg.title, pg]));
  for (const t of batch) {
    const pg = byTitle.get(norm.get(t));
    const ii = pg?.imageinfo?.[0];
    if (ii) wanted.set(t, { url: ii.url, width: ii.width, height: ii.height, mime: ii.mime, descriptionurl: ii.descriptionurl, canonical: pg.title });
  }
  await sleep(250);
}

// ---- baixa
const RAW = p('data/raw/images');
const jobs = [];
const manifest = {};
for (const { id, cands } of plan) {
  manifest[id] = [];
  const seenUrl = new Set();
  for (const cand of cands) {
    let url, meta, pageUrl, credit, licensing;
    if (cand.url) {
      url = cand.url;
      pageUrl = cand.url;
      credit = 'Hyrule Compendium API (gadhagod) — foto do compendium de BOTW';
      licensing = 'Copyright © Nintendo';
    } else {
      meta = wanted.get(cand.file);
      if (!meta) continue;
      url = meta.url;
      pageUrl = `https://zeldawiki.wiki/wiki/${encodeURIComponent(meta.canonical.replace(/ /g, '_'))}`;
      const fm = filesMeta.get(meta.canonical);
      licensing = fm?.licensing === 'Copyright' ? 'Copyright © Nintendo (publicado no Zelda Wiki sob uso justo)' : fm?.licensing || 'Copyright © Nintendo';
      credit = 'Zelda Wiki' + (fm?.source ? ` — origem: ${fm.source.replace(/\[(\S+) ([^\]]+)\]/g, '$2').replace(/\s+/g, ' ').trim()}` : '');
    }
    if (seenUrl.has(url)) continue;
    seenUrl.add(url);
    const role = cand.role === 'icon_alt' ? (manifest[id].some((x) => x.role === 'icon') ? null : 'icon') : cand.role;
    if (!role) continue;
    const ext = (url.match(/\.(png|jpe?g|webp|gif)(?:$|\?)/i)?.[1] ?? 'png').toLowerCase();
    const file = path.join(RAW, role === 'dye' ? 'dye' : role, `${id}${cand.color ? '__' + slugify(cand.color) : ''}.${ext}`);
    manifest[id].push({
      role,
      color: cand.color ?? null,
      color_pt: cand.color_pt ?? null,
      file: path.relative(p(), file).replace(/\\/g, '/'),
      source_url: url,
      page_url: pageUrl,
      width: meta?.width ?? 280,
      height: meta?.height ?? 280,
      credit,
      license: licensing,
      rights_holder: 'Nintendo',
    });
    if (!fs.existsSync(file)) jobs.push({ url, file });
  }
}

log(`imagens: ${jobs.length} downloads pendentes`);
let failed = 0;
await pool(jobs, 6, async (j) => {
  try {
    const res = await fetchRetry(j.url, { tries: 4 });
    if (res.status !== 200) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(j.file), { recursive: true });
    fs.writeFileSync(j.file, buf);
  } catch (e) {
    failed++;
    console.error('falha', j.url, e.message);
  }
});
// remove do manifesto o que não foi baixado
for (const id of Object.keys(manifest)) manifest[id] = manifest[id].filter((x) => fs.existsSync(p(x.file)));
writeJson(p('data/inventory/images-manifest.json'), manifest);
const without = Object.entries(manifest).filter(([, v]) => !v.some((x) => x.role !== 'dye')).map(([k]) => k);
log(`imagens: concluído (${failed} falhas). Entidades sem nenhuma imagem: ${without.length}`);
if (without.length) log(without.join(' '));
