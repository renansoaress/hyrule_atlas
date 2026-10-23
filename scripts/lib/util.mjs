// Utilitários compartilhados pelos scripts de importação, build e validação.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const p = (...parts) => path.join(ROOT, ...parts);

export const USER_AGENT =
  'HyruleAtlas/1.0 (enciclopedia offline pessoal; build de dados; contato via repositorio local)';

export function readJson(file, fallback) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Arquivo não encontrado: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, data, { pretty = true } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, pretty ? JSON.stringify(data, null, 2) + '\n' : JSON.stringify(data));
}

export function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch com repetição e backoff; devolve Response já validada. */
export async function fetchRetry(url, { tries = 5, delay = 1500, headers = {}, timeout = 90000 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 404) return res;
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(delay * (i + 1));
    }
  }
  throw lastErr;
}

export async function fetchJson(url, opts) {
  const res = await fetchRetry(url, opts);
  if (res.status === 404) return null;
  return res.json();
}

/** Executa tarefas assíncronas com concorrência limitada. */
export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

/** slug estável em ASCII para ids e nomes de arquivo. */
export function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Normaliza um nome em inglês para comparação (chave de junção entre fontes). */
export function normKey(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Title Case em inglês usado para exibir nomes vindos do compendium (que vêm em minúsculas). */
export function titleCaseEn(s) {
  const small = new Set(['of', 'the', 'a', 'an', 'and', 'in', 'on', 'to', 'for']);
  return String(s)
    .split(' ')
    .map((w, i) => {
      if (i > 0 && small.has(w)) return w;
      return w
        .split('-')
        .map((part) => {
          if (/^(i|ii|iii|iv)$/i.test(part)) return part.toUpperCase();
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join('-');
    })
    .join(' ')
    .replace(/\(([a-z])/g, (_, c) => '(' + c.toUpperCase());
}

export function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(full, ext));
    else if (!ext || e.name.endsWith(ext)) out.push(full);
  }
  return out;
}

export function log(...args) {
  console.log('[atlas]', ...args);
}
