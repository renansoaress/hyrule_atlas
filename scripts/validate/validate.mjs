// Validação completa da base gerada (src/generated/atlas.json) e da distribuição.
// Uso: node scripts/validate/validate.mjs [--strict] [--dist]
//   --strict  fichas pendentes, status "a_verificar" sem justificativa e avisos de repetição viram erro
//   --dist    também verifica dist/ e release/ (recursos remotos, imagens copiadas, HTML único)
import fs from 'node:fs';
import path from 'node:path';
import { readJson, writeJson, p, log, listFiles } from '../lib/util.mjs';
import { ACTIONS, STATUSES, KINDS, CAPABILITIES } from '../lib/schema.mjs';

const strict = process.argv.includes('--strict');
const checkDist = process.argv.includes('--dist');
const atlas = readJson(p('src/generated/atlas.json'));
const E = atlas.entities;
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => (strict ? errors : warnings).push(m);

// ---- ids
const ids = new Set();
for (const e of E) {
  if (ids.has(e.id)) err(`id duplicado: ${e.id}`);
  ids.add(e.id);
  if (!/^botw_[a-z]+_[a-z0-9_]+$/.test(e.id)) err(`id fora do padrão: ${e.id}`);
}

// ---- nomes
const ptNames = new Map();
for (const e of E) {
  if (!e.name_ptbr?.trim()) err(`${e.id}: sem nome PT-BR`);
  if (!['oficial', 'oficial_secundaria', 'nao_oficial'].includes(e.name_status)) err(`${e.id}: status de nome inválido`);
  const k = e.name_ptbr.toLowerCase();
  if (ptNames.has(k)) err(`nome PT-BR repetido: "${e.name_ptbr}" (${ptNames.get(k)} e ${e.id})`);
  ptNames.set(k, e.id);
}

// ---- conteúdo
const pending = E.filter((e) => e.content_status !== 'redigida');
if (pending.length) (strict ? err : warn)(`${pending.length} fichas sem texto redigido: ${pending.slice(0, 15).map((e) => e.id).join(', ')}${pending.length > 15 ? '…' : ''}`);
for (const e of E) {
  if (e.content_status !== 'redigida') continue;
  if (!e.summary || !e.description) err(`${e.id}: summary/description vazios`);
  for (const it of e.interactions) {
    if (!ACTIONS[it.action]) err(`${e.id}: ação inválida ${it.action}`);
    if (!STATUSES[it.status]) err(`${e.id}: status inválido ${it.status}`);
    if (it.kind && !KINDS[it.kind]) err(`${e.id}: kind inválido ${it.kind}`);
    if (['confirmado', 'sem_efeito'].includes(it.status)) {
      if (!it.sources?.length) err(`${e.id}/${it.action}: interação ${it.status} sem fonte`);
      for (const k of it.sources ?? []) if (!e.sources.some((s) => s.key === k)) err(`${e.id}/${it.action}: fonte "${k}" não resolvida`);
    }
    for (const pid of it.produces ?? []) if (!ids.has(pid)) err(`${e.id}/${it.action}: produces inexistente ${pid}`);
  }
  for (const s of e.secrets) {
    if (!KINDS[s.kind]) err(`${e.id}: segredo com kind inválido`);
    if (s.kind !== 'nao_verificado') for (const k of s.sources ?? []) if (!e.sources.some((x) => x.key === k)) err(`${e.id}: fonte de segredo "${k}" não resolvida`);
  }
  for (const c of e.capabilities) if (!CAPABILITIES[c]) err(`${e.id}: capability inválida ${c}`);
}

// ---- relações
for (const e of E) for (const r of e.related) if (!ids.has(r.id)) err(`${e.id}: relacionado inexistente ${r.id}`);

// ---- textos genéricos/repetidos
const strip = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const bySummary = new Map();
const byDesc = new Map();
for (const e of E.filter((x) => x.content_status === 'redigida')) {
  const s = strip(e.summary);
  const d = strip(e.description);
  if (bySummary.has(s)) err(`summary idêntico em ${bySummary.get(s)} e ${e.id}`);
  bySummary.set(s, e.id);
  if (byDesc.has(d)) err(`description idêntica em ${byDesc.get(d)} e ${e.id}`);
  byDesc.set(d, e.id);
}
// frases longas repetidas em muitas descrições indicam preenchimento por modelo
const sentenceCount = new Map();
for (const e of E.filter((x) => x.content_status === 'redigida')) {
  const seen = new Set();
  for (const sent of String(e.description).split(/(?<=[.!?])\s+/)) {
    const k = strip(sent);
    if (k.length < 70 || seen.has(k)) continue;
    seen.add(k);
    if (!sentenceCount.has(k)) sentenceCount.set(k, []);
    sentenceCount.get(k).push(e.id);
  }
}
const repeated = [...sentenceCount.entries()].filter(([, v]) => v.length >= 6).sort((a, b) => b[1].length - a[1].length);
for (const [s, v] of repeated.slice(0, 20)) warn(`frase repetida em ${v.length} descrições: "${s.slice(0, 110)}…" (ex.: ${v.slice(0, 3).join(', ')})`);

const TOTK = /tears of the kingdom|\btotk\b|ultram[aã]o|ultrahand|fus[aã]o de|\bfuse\b|zonaite|profundezas|depths|ilhas do c[eé]u|sky islands/i;
for (const e of E) {
  const blob = [e.summary, e.description, ...e.uses, ...e.obtaining, ...e.effects, ...e.interactions.map((i) => i.result), ...e.secrets.map((s) => s.text)].join(' ');
  const m = blob.match(TOTK);
  if (m) warn(`${e.id}: menciona "${m[0]}" — confirme que é só ressalva comparativa`);
}

// ---- imagens
let imgCount = 0;
for (const e of E) {
  const paths = [e.image.main, e.image.thumb, e.image.icon, ...e.image.gallery.map((g) => g.src), ...e.image.dyes.map((d) => d.src)].filter(Boolean);
  if (!e.image.main) err(`${e.id}: sem imagem principal`);
  for (const ip of paths) {
    imgCount++;
    if (/^https?:|^\/\//.test(ip)) err(`${e.id}: imagem remota ${ip}`);
    else if (!fs.existsSync(p('public', ip))) err(`${e.id}: imagem ausente public/${ip}`);
  }
  if (!e.image_credits.length) err(`${e.id}: imagem sem crédito/licença registrados`);
}

// ---- fontes
for (const e of E) if (!e.sources.length) err(`${e.id}: sem fontes`);

// ---- distribuição
if (checkDist) {
  const remoteRes = /(?:<script[^>]+src|<link[^>]+href|<img[^>]+src)\s*=\s*["'](?:https?:)?\/\//gi;
  const cssRemote = /url\(\s*["']?(?:https?:)?\/\//gi;
  for (const f of [p('dist/index.html'), p('release/Hyrule-Atlas-Offline/index.html'), p('release/Hyrule-Atlas-Offline.html')]) {
    if (!fs.existsSync(f)) {
      err(`ausente: ${path.relative(p(), f)}`);
      continue;
    }
    const t = fs.readFileSync(f, 'utf8');
    if (remoteRes.test(t)) err(`${path.relative(p(), f)}: referência a recurso remoto`);
    if (cssRemote.test(t)) err(`${path.relative(p(), f)}: CSS com url() remota`);
    if (/type="module"/.test(t) && !f.endsWith(path.join('dist', 'index.html'))) err(`${path.relative(p(), f)}: script type=module (bloqueado em file://)`);
  }
  const css = fs.readFileSync(p('dist/assets/style.css'), 'utf8');
  if (cssRemote.test(css) || /@import\s+url\(\s*["']?https?:/.test(css)) err('style.css referencia recursos remotos');
  const js = fs.readFileSync(p('dist/assets/app.js'), 'utf8');
  if (/\bimport\s*\(\s*["']https?:/.test(js) || /fetch\(\s*["']https?:/.test(js)) err('app.js faz chamadas/imports remotos');
  const relImgs = new Set(listFiles(p('release/Hyrule-Atlas-Offline/assets/img'), '.webp').map((f) => path.relative(p('release/Hyrule-Atlas-Offline'), f).replace(/\\/g, '/')));
  for (const e of E) for (const ip of [e.image.main, e.image.thumb]) if (ip && !relImgs.has(ip)) err(`release sem imagem ${ip}`);
}

const report = { generated_at: new Date().toISOString(), strict, entities: E.length, images_checked: imgCount, errors, warnings, repeated_sentences: repeated.length };
writeJson(p('reports/validacao.json'), report);
for (const w of warnings.slice(0, 40)) console.log('aviso: ' + w);
if (warnings.length > 40) console.log(`… +${warnings.length - 40} avisos (reports/validacao.json)`);
for (const x of errors.slice(0, 80)) console.log('ERRO:  ' + x);
log(`validação: ${E.length} entidades, ${imgCount} referências de imagem — ${errors.length} erros, ${warnings.length} avisos`);
process.exit(errors.length ? 1 : 0);
