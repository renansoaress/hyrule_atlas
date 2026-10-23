import fs from 'node:fs';
import { parseDataTables } from './wikitable.mjs';
import { p } from './util.mjs';

// Índice das tabelas Cargo (DataTables) para expandir {{Data Table Copy}}.
let storedTables = null;
function storedTable(page, tableName) {
  if (!storedTables) {
    storedTables = new Map();
    const file = p('data/raw/zeldawiki/data_tables.json');
    const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).rows : [];
    for (const c of rows) {
      const k = c.page + '|' + c.tableName;
      if (!storedTables.has(k)) storedTables.set(k, { columns: [], rows: new Map() });
      const t = storedTables.get(k);
      if (c.columns) t.columns = c.columns.split(',').filter((x) => !/\[Colspan:\d+\]/.test(x)).map((x) => x.replace(/\[.*?\]/g, '').trim());
      if (c.rowIndex === '' || c.rowIndex == null) continue;
      if (!t.rows.has(c.rowIndex)) t.rows.set(c.rowIndex, []);
      t.rows.get(c.rowIndex)[Number(c.columnIndex) - 1] = c.cell;
    }
  }
  return storedTables.get(page + '|' + tableName);
}

function expandDataTableCopy(named) {
  const t = storedTable(named.fromPage, named.storedAs);
  if (!t) return `[tabela copiada de ${named.fromPage}]`;
  const want = (named.columns ?? t.columns.join(',')).split(',').map((x) => x.trim());
  const idx = want.map((w) => t.columns.indexOf(w)).filter((i) => i >= 0);
  const terms = (named.rowsWith ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const rows = [...t.rows.values()].filter((r) => !terms.length || terms.some((term) => r.some((cell) => (cell ?? '').includes(term))));
  return '\n' + rows.map((r) => '- ' + idx.map((i) => (r[i] ?? '').replace(/\n+/g, ' ')).join(' | ')).join('\n') + '\n';
}

// Conversão aproximada de wikitext do Zelda Wiki para texto legível, com extração das partes
// específicas de Breath of the Wild (as seções de Tears of the Kingdom e outros jogos são descartadas).

const GAME_NAMES = {
  BotW: 'Breath of the Wild',
  TotK: 'Tears of the Kingdom',
  TLoZ: 'The Legend of Zelda',
  ALttP: 'A Link to the Past',
  OoT: 'Ocarina of Time',
  MM: "Majora's Mask",
  TWW: 'The Wind Waker',
  TWWHD: 'The Wind Waker HD',
  TP: 'Twilight Princess',
  TPHD: 'Twilight Princess HD',
  SS: 'Skyward Sword',
  SSHD: 'Skyward Sword HD',
  ALBW: 'A Link Between Worlds',
  HWL: 'Hyrule Warriors Legends',
  HWDE: 'Hyrule Warriors: Definitive Edition',
  AoC: 'Hyrule Warriors: Age of Calamity',
  AoI: 'Hyrule Warriors: Age of Imprisonment',
  EoW: 'Echoes of Wisdom',
  SSB: 'Super Smash Bros.',
  SSB4: 'Super Smash Bros. for Wii U/3DS',
  SSBU: 'Super Smash Bros. Ultimate',
  CoH: 'Cadence of Hyrule',
  LA: "Link's Awakening",
  TMC: 'The Minish Cap',
};
const DLC = { TMT: 'DLC 1: The Master Trials', TCB: "DLC 2: The Champions' Ballad" };

/** Encontra o índice de fechamento de um template/ligação balanceado. */
function matchClose(s, start, open, close) {
  let depth = 0;
  for (let i = start; i < s.length - 1; i++) {
    if (s[i] === open[0] && s[i + 1] === open[1]) {
      depth++;
      i++;
    } else if (s[i] === close[0] && s[i + 1] === close[1]) {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Divide argumentos de template no nível superior. */
export function splitArgs(inner) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      depth++;
      cur += two;
      i++;
      continue;
    }
    if (two === '}}' || two === ']]') {
      depth--;
      cur += two;
      i++;
      continue;
    }
    if (inner[i] === '|' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += inner[i];
  }
  out.push(cur);
  return out;
}

function namedArgs(args) {
  const named = {};
  const pos = [];
  for (const a of args) {
    const m = a.match(/^\s*([\w .-]+?)\s*=([\s\S]*)$/);
    if (m && !/^\s*\[\[/.test(a)) named[m[1].trim()] = m[2].trim();
    else pos.push(a.trim());
  }
  return { named, pos };
}

function expandTemplate(name, args) {
  const n = name.trim();
  const { named, pos } = namedArgs(args);
  const lower = n.toLowerCase();
  if (GAME_NAMES[n]) return GAME_NAMES[n];
  if (n === 'TLoZ Series') return 'série The Legend of Zelda';
  if (n === 'DLC') return `(${DLC[pos[0]] ?? 'DLC'})`;
  if (n === 'Rupee' || n === 'Rupees') return `${pos[1] ?? pos[0]} rupees`;
  if (n === 'Mon') return `${pos[0]} Mon`;
  if (n === 'Poe') return `${pos[0]} Poes`;
  if (n === 'Term' || n === 'Term/Store') return pos[1] ?? pos[0] ?? '';
  if (n === 'Plural') return (pos[1] ?? '') + 's';
  if (n === 'Exp') return pos.length > 1 ? `${pos[1]} (${pos[0]})` : `(${pos[0]})`;
  if (n === 'Exp Game') return `(${pos.map((g) => GAME_NAMES[g.trim()] ?? g).join(', ')})`;
  if (n.startsWith('Color')) return pos[pos.length - 1] ?? '';
  if (n === 'Icon') return `[${(pos[0] ?? '').replace(/^BotW /, '')}]`;
  if (n === 'Big' || n === 'Small' || n === 'Nowrap' || n === 'Hidden') return pos[0] ?? '';
  if (n === 'Sic') return '';
  if (n === ',') return ',';
  if (n === '!') return '|';
  if (n === 'List') return pos.join('\n');
  if (n === 'Cite') return `“${pos[0] ?? ''}” — ${pos[1] ?? ''} (${GAME_NAMES[pos[2]?.trim()] ?? pos[2] ?? ''})`;
  if (n === 'Version') return `versão ${pos[1] ?? ''}`;
  if (n === 'Heart' || n === 'Hearts') return `${pos[0] ?? ''} coração(ões)`;
  if (n === 'HeartAmount') return `${pos[0] ?? ''} corações`;
  if (n === 'Game Label') return '';
  if (n === 'Main' || n === 'See Also' || n === 'Hatnote' || n === 'Stub' || n === 'Checklist') return '';
  if (n === 'Noncanon' || n === 'Nomenclature' || n === 'All Images' || n === 'Please Upload') return '';
  if (n === 'Name Ref' || n === 'Media' || lower.startsWith('infobox') || lower.endsWith('nav')) return '';
  if (n === 'Categories' || n === 'Ref' || n === 'DISPLAYTITLE' || n.startsWith('DISPLAYTITLE')) return '';
  if (n === 'Material Armors') return `[lista de armaduras que usam ${pos[1] ?? ''} — ver dados estruturados]`;
  if (n === 'Spawn Locations') return '';
  if (n === 'Infobox Game Blocks') {
    return named.BotW ? named.BotW : '';
  }
  if (n === 'Collapsible') return named.content ?? '';
  if (n === 'Data Table Copy') return expandDataTableCopy(named);
  if (n === 'Data Table') return '[tabela de dados]';
  if (n === 'Translation Page' || n === 'Terminology') return '';
  // padrão: mantém o último argumento posicional (geralmente o texto exibido)
  return pos.length ? pos[pos.length - 1] : '';
}

/** Expande templates recursivamente (de dentro para fora). */
export function expandTemplates(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '{' && s[i + 1] === '{') {
      const end = matchClose(s, i, '{{', '}}');
      if (end < 0) {
        out += s.slice(i);
        break;
      }
      const inner = s.slice(i + 2, end - 2);
      const args = splitArgs(inner);
      const name = args.shift() ?? '';
      const expandedArgs = args.map((a) => expandTemplates(a));
      out += expandTemplate(name.split(':')[0], expandedArgs);
      i = end;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

export function cleanLinks(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '[' && s[i + 1] === '[') {
      const end = matchClose(s, i, '[[', ']]');
      if (end < 0) {
        out += s.slice(i);
        break;
      }
      const inner = s.slice(i + 2, end - 2);
      if (/^(File|Image|Category):/i.test(inner)) {
        out += '';
      } else {
        const parts = splitArgs(inner);
        out += cleanLinks(parts[parts.length - 1]);
      }
      i = end;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

/** Substitui blocos {{Data Table}} por linhas legíveis "- célula | célula". */
function renderDataTables(s) {
  if (!/\{\{Data Table\s*\n/.test(s)) return s;
  const tables = parseDataTables(s);
  if (!tables.length) return s;
  let out = '';
  let last = 0;
  for (const t of tables) {
    // localizar o fim do bloco a partir do offset
    let depth = 0, i = t.offset, end = -1;
    for (; i < s.length - 1; i++) {
      if (s[i] === '{' && s[i + 1] === '{') { depth++; i++; }
      else if (s[i] === '}' && s[i + 1] === '}') { depth--; i++; if (depth === 0) { end = i + 1; break; } }
    }
    if (end < 0) break;
    const header = t.columns.length ? `(colunas: ${t.columns.join(' | ')})\n` : '';
    const rows = t.rows.map((r) => '- ' + r.map((c) => c.replace(/\n+/g, ' ').trim()).join(' | ')).join('\n');
    out += s.slice(last, t.offset) + '\n' + header + rows + '\n';
    last = end;
  }
  return out + s.slice(last);
}

export function wikiToText(s) {
  if (!s) return '';
  let t = renderDataTables(s);
  t = t.replace(/<!--[\s\S]*?-->/g, '');
  t = t.replace(/<ref[^>]*\/>/g, '');
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
  t = t.replace(/<gallery[\s\S]*?<\/gallery>/g, '');
  t = expandTemplates(t);
  t = cleanLinks(t);
  // marcador de variável do texto do jogo: <tooltip>X<texto>Low/High</texto></tooltip> -> "[Low/High]"
  t = t.replace(/<span class="zw-tooltip">[^<]*<span class="zw-tooltip__text[^"]*">([^<]*)<\/span><\/span>/g, '[$1]');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/?(span|div|small|big|q|i|b|u|sup|sub|center|poem|nowiki|code|s)[^>]*>/gi, '');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/'''''|'''|''/g, '');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  t = t.replace(/__\w+__/g, '');
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/** Lê os parâmetros do primeiro {{Infobox ...}} e devolve o texto específico de BotW de cada campo. */
export function infoboxBotW(wikitext) {
  const m = wikitext.match(/\{\{Infobox[^|\n]*/);
  if (!m) return {};
  const end = matchClose(wikitext, m.index, '{{', '}}');
  const inner = wikitext.slice(m.index + 2, end - 2);
  const args = splitArgs(inner).slice(1);
  const { named } = namedArgs(args);
  const out = {};
  for (const [k, v] of Object.entries(named)) {
    if (['image', 'caption', 'pronunciation', 'comp', 'sample', 'theme'].includes(k)) continue;
    let val = v;
    if (/\{\{Infobox Game Blocks/.test(v)) {
      const b = v.match(/\|\s*BotW\s*=([\s\S]*?)(?=\n\s*\|\s*\w+\s*=|\}\}\s*$)/);
      val = b ? b[1] : '';
    }
    const text = wikiToText(val);
    if (text) out[k] = text;
  }
  return out;
}

/** Divide wikitext em seções [{level, heading, body}]. */
export function sections(wikitext) {
  const lines = wikitext.split('\n');
  const out = [{ level: 0, heading: '(introdução)', raw: '', body: [] }];
  for (const line of lines) {
    const h = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if (h) out.push({ level: h[1].length, heading: h[2], raw: h[2], body: [] });
    else out[out.length - 1].body.push(line);
  }
  return out.map((s) => ({ ...s, body: s.body.join('\n') }));
}

const OTHER_GAME_RE =
  /\{\{(TotK|TLoZ|ALttP|OoT|MM|TWW|TWWHD|TP|TPHD|SS|SSHD|ALBW|HWL|HWDE|AoC|AoI|EoW|SSB\w*|CoH|LA|TMC|AoL|OoX|FS|FSA|PH|ST|TFH|LADX|LANS|BS|TAoL|OoA|OoS|MC)\b/;
const SKIP_HEADINGS = /^(Nomenclature|Gallery|See Also|References|Other Appearances|Non-canon Appearances|Names in Other Regions|Etymology)$/i;

/**
 * Extrai somente o conteúdo relevante a BotW. Regras:
 * - introdução é mantida;
 * - seções cujo título cita outro jogo (TotK etc.) são descartadas com as subseções;
 * - seções cujo título cita BotW são mantidas com as subseções;
 * - seções genéricas (ex.: "Location and Uses") são mantidas se a página é exclusiva de BotW,
 *   senão apenas parágrafos/itens que mencionam BotW.
 */
export function extractBotW(wikitext, { botwOnlyPage = false } = {}) {
  const secs = sections(wikitext);
  const kept = [];
  let mode = null; // 'keep' | 'drop' herdado por subseções
  let modeLevel = 99;
  for (const s of secs) {
    const heading = s.heading;
    if (s.level && s.level <= modeLevel) {
      mode = null;
      modeLevel = 99;
    }
    if (s.level === 0) {
      kept.push(s);
      continue;
    }
    const headText = wikiToText(heading);
    if (SKIP_HEADINGS.test(headText)) {
      mode = 'drop';
      modeLevel = s.level;
      continue;
    }
    if (/\{\{BotW\b|Breath of the Wild/.test(heading)) {
      mode = 'keep';
      modeLevel = s.level;
      kept.push(s);
      continue;
    }
    if (OTHER_GAME_RE.test(heading) || /Tears of the Kingdom/.test(heading)) {
      mode = 'drop';
      modeLevel = s.level;
      continue;
    }
    if (mode === 'drop') continue;
    if (mode === 'keep' || botwOnlyPage) {
      kept.push(s);
      continue;
    }
    // seção genérica numa página multijogo: mantém apenas itens que citam BotW
    const parts = s.body.split(/\n(?=\*|\n)/).filter((x) => /BotW|Breath of the Wild/.test(x) && !/TotK\b/.test(x));
    if (parts.length) kept.push({ ...s, body: parts.join('\n') });
  }
  const text = kept
    .map((s) => (s.level ? `${'#'.repeat(Math.min(s.level, 4))} ${wikiToText(s.heading)}\n` : '') + wikiToText(s.body))
    .filter((x) => x.trim())
    .join('\n\n');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/** Extrai referências <ref name="BotW ...">...</ref> (citações do jogo), já como texto. */
export function botwRefs(wikitext) {
  const out = [];
  const re = /<ref name="([^"]+)">([\s\S]*?)<\/ref>/g;
  let m;
  while ((m = re.exec(wikitext))) {
    const [, name, body] = m;
    if (!/^BotW|\|BotW\}\}/.test(name) && !/\|\s*BotW\s*\}\}/.test(body)) continue;
    if (/\|\s*TotK\s*\}\}/.test(body)) continue;
    out.push({ name, text: wikiToText(body) });
  }
  return out;
}

export function pageGames(wikitext) {
  const m = wikitext.match(/\|\s*game\s*=\s*([^\n]*)/);
  if (!m) return [];
  return wikiToText(m[1])
    .split(/[,\n]/)
    .map((g) => g.trim())
    .filter(Boolean);
}
