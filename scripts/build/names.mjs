// Resolve o nome em PT-BR de cada entidade e de cada termo recorrente (locais, efeitos).
// Prioridade:
//   1. data/glossary/ptbr-overrides.json   (correções justificadas)
//   2. Zelda Wiki Nomenclature (lang=ptB, game=BotW) — cita o texto do jogo      -> status "oficial"
//   3. Coelho News (transcrição da localização oficial)                         -> status "oficial_secundaria"
//   4. data/glossary/ptbr-unofficial.json  (tradução própria e consistente)     -> status "nao_oficial"
// A grafia de (3) é normalizada para o padrão da localização oficial (minúsculas, exceto nomes próprios),
// observado nas citações do compendium e em Echoes of Wisdom ("Escudo hyliano", "Bomba remota").
import { readJson, writeJson, p, log, normKey } from '../lib/util.mjs';
import { wikiToText } from '../lib/wikiclean.mjs';

const inv = readJson(p('data/inventory/inventory.json'));
const nomen = readJson(p('data/raw/zeldawiki/nomenclature_ptb.json')).rows;
const coelho = readJson(p('data/raw/ptbr/coelhonews-pairs.json'));
const overrides = readJson(p('data/glossary/ptbr-overrides.json'), {});
const unofficial = readJson(p('data/glossary/ptbr-unofficial.json'), {});
const terms = readJson(p('data/glossary/terms.json'), {});

export const PROPER = new Set(
  `Hyrule Hylia Gerudo Zora Goron Sheikah Korok Kobo Koboblin Moblin Lagal Lagalfos Centaleão Rinox Octoroc Morci
  Chulchul Molduga Dinraal Naydra Farosh Tabantha Hateno Kakariko Eldin Lanayru Akkala Faron Hebra Necluda Ganon
  Mipha Daruk Revali Urbosa Biggoron Medoh Ruta Rudania Naboris Hestu Kilton Ará Arás Yiga Deko Mestra Satori Lomei
  Malanya Epona Zelda Link Tingle Ravio Midna Zant Majora Sheik Deidade Feroz Nintendo Switch Calamidade Besta Sombria
  Maz Koshia Kohga Zero Stalboblin Stalmoblin Stallagalfos Stalnox Stalcavalo Tálus Brita Rupelho Lurelin Ishka Nício
  Floresta Pradaria Montanha Vila Cidade Domínio Território Planalto Lago Mar Deserto Cordilheira Cordilheiras Monte
  Prados Cânion Palude Fronteira Tundra Cerros Montanhas Altiplano Coração Ilha Floria Hylianas Kochi Kass Robbie Purah`
    .split(/\s+/)
    .filter(Boolean),
);

/** Converte "Espada do Viajante" -> "Espada do viajante", preservando nomes próprios e siglas. */
export function sentenceCase(name) {
  const words = name.split(' ');
  return words
    .map((w, i) => {
      if (i === 0) return w;
      const bare = w.replace(/[(),:;.!?"]/g, '');
      if (!bare) return w;
      if (PROPER.has(bare)) return w;
      if (/^[A-Z0-9.+]+$/.test(bare) && bare.length <= 4) return w; // siglas e "2.0"
      if (/^\d/.test(bare)) return w;
      // compostos com hífen: "Lótus-fugaz", "Corta-fogo"
      return w.toLowerCase();
    })
    .join(' ');
}

// ---- índices das fontes
const wikiPt = new Map();
for (const r of nomen) {
  const t = wikiToText(r.translation).trim();
  if (!t || t.length > 60 || /[.!?…]$/.test(t)) continue; // descarta frases citadas por engano
  const k = normKey(r.subject.replace(/ \(.*\)$/, ''));
  if (!wikiPt.has(k)) wikiPt.set(k, { ptbr: t, subject: r.subject, ref: wikiToText(r.ref).slice(0, 200) });
}
const coelhoPt = new Map();
for (const pr of coelho.pairs) coelhoPt.set(normKey(pr.en), pr);

function resolve(nameEn, aliases = [], { normalizeCase = true } = {}) {
  const keys = [nameEn, ...aliases].map(normKey);
  for (const k of keys) {
    if (overrides[k] || overrides[nameEn]) {
      const o = overrides[nameEn] ?? overrides[k];
      return { name_ptbr: o.ptbr, status: o.status, source: o.source ?? 'override', note: o.note ?? null };
    }
  }
  for (const k of keys) {
    const w = wikiPt.get(k);
    if (w)
      return {
        name_ptbr: w.ptbr,
        status: 'oficial',
        source: 'Zelda Wiki — Nomenclature (ptB)',
        note: w.ref ? `Referência: ${w.ref}` : null,
      };
  }
  for (const k of keys) {
    const c = coelhoPt.get(k);
    if (c) {
      // nomes de lugares mantêm a grafia da fonte (são nomes próprios)
      const normalized = normalizeCase ? sentenceCase(c.ptbr) : c.ptbr;
      return {
        name_ptbr: normalized,
        status: 'oficial_secundaria',
        source: 'Coelho News (transcrição da localização oficial PT-BR)',
        note: normalized !== c.ptbr ? `Grafia na fonte: "${c.ptbr}" (normalizada para o padrão da localização oficial).` : null,
      };
    }
  }
  const u = unofficial[nameEn];
  if (u) return { name_ptbr: u, status: 'nao_oficial', source: 'Tradução do Hyrule Atlas', note: null };
  return null;
}

// ---- entidades
const names = {};
const missing = [];
const conflicts = [];
for (const e of inv) {
  const r = resolve(e.name_en, e.aliases_en);
  if (!r) {
    missing.push(e.name_en);
    continue;
  }
  // conflito entre fonte primária e secundária (para auditoria)
  const w = wikiPt.get(normKey(e.name_en));
  const c = coelhoPt.get(normKey(e.name_en));
  if (w && c && normKey(w.ptbr) !== normKey(c.ptbr))
    conflicts.push({ name_en: e.name_en, zeldawiki: w.ptbr, coelhonews: c.ptbr, chosen: r.name_ptbr });
  const variants = e.variants.map((v) => ({ name_en: v.name_en, ...(resolve(v.name_en) ?? { name_ptbr: null }) }));
  names[e.id] = { name_en: e.name_en, ...r, variants };
}

// ---- termos recorrentes (locais, efeitos etc.)
const termOut = {};
const termMissing = [];
const allTerms = new Set();
for (const e of inv) for (const l of e.facts.compendium?.common_locations ?? []) allTerms.add(l);
for (const t of Object.keys(terms)) allTerms.add(t);
for (const t of allTerms) {
  const r = resolve(t, [], { normalizeCase: false });
  if (r) termOut[t] = r;
  else if (terms[t]) termOut[t] = { name_ptbr: terms[t], status: 'nao_oficial', source: 'Tradução do Hyrule Atlas' };
  else termMissing.push(t);
}

writeJson(p('data/glossary/names.json'), names);
writeJson(p('data/glossary/terms-resolved.json'), termOut);
writeJson(p('data/glossary/names-report.json'), { missing, termMissing, conflicts });
const st = {};
for (const n of Object.values(names)) st[n.status] = (st[n.status] ?? 0) + 1;
log(`nomes PT-BR: ${Object.keys(names).length} resolvidos`, st, `| sem nome: ${missing.length} | termos sem tradução: ${termMissing.length} | conflitos: ${conflicts.length}`);
