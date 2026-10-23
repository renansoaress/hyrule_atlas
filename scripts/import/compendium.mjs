// Importa o Hyrule Compendium de BOTW (incluindo as entradas exclusivas do Modo Mestre/DLC).
// Fonte: Hyrule Compendium API (https://github.com/gadhagod/Hyrule-Compendium-API, código MIT).
// O texto e as imagens do compendium pertencem à Nintendo; ver reports/fontes-e-creditos.md.
import { fetchJson, writeJson, p, log } from '../lib/util.mjs';

const BASE = 'https://api.hyrule-compendium.com/v3/compendium';

const regular = await fetchJson(`${BASE}/all?game=botw`);
const master = await fetchJson(`${BASE}/master_mode/all`);
if (!regular?.data?.length) throw new Error('Compendium vazio — a API mudou?');

const entries = [
  ...regular.data.map((e) => ({ ...e, master_mode: false })),
  ...(master?.data ?? []).map((e) => ({ ...e, master_mode: true })),
];

writeJson(p('data/raw/compendium.json'), {
  source: `${BASE}/all?game=botw`,
  source_master_mode: `${BASE}/master_mode/all`,
  fetched_at: new Date().toISOString(),
  license_note:
    'Código da API sob licença MIT. Textos e imagens do Hyrule Compendium © Nintendo; usados apenas como referência.',
  count: entries.length,
  entries,
});
log(`compendium: ${regular.data.length} entradas regulares + ${master?.data?.length ?? 0} do Modo Mestre`);
