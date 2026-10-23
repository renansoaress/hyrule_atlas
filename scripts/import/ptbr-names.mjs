// Extrai pares "nome em inglês → nome oficial em PT-BR" da lista publicada pela Coelho News,
// compilada a partir da localização oficial em português lançada pela Nintendo em 05/06/2025.
// Fonte secundária: os nomes vêm do jogo, mas a transcrição é de terceiros e contém erros de digitação
// (corrigidos em data/inventory/ptbr-overrides.json, sempre com justificativa).
// Apenas os pares extraídos são guardados; o HTML da página não é armazenado.
import { fetchRetry, writeJson, p, log } from '../lib/util.mjs';

const URL = 'https://coelhonews.com/guias/traducoes-em-portugues-de-zelda-botw-e-totk-o-que-mudou-nos-jogos';

const html = await (await fetchRetry(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (HyruleAtlas data build)' } })).text();

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const text = decode(
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, '\n'),
);
const lines = text
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

const SECTIONS = new Set([
  'Locais Importantes',
  'Materiais',
  'Criaturas',
  'Partes de Monstros',
  'Outros Materiais',
  'Armas',
  'Arcos e Flechas',
  'Escudos',
  'Inimigos',
  'Personagens Importantes',
  'Outros nomes e termos',
  'Outros Nomes e Termos',
]);

let section = null;
let started = false;
const pairs = [];
for (const line of lines) {
  if (SECTIONS.has(line)) {
    // o sumário repete os títulos; a lista começa no primeiro título seguido de pares.
    section = line;
    continue;
  }
  const m = line.match(/^(.+?)\s*→\s*(.+)$/);
  if (m && section) {
    started = true;
    pairs.push({ section, en: m[1].trim().replace(/’/g, "'"), ptbr: m[2].trim() });
  } else if (started && /^Vídeos da Comunidade/.test(line)) {
    break;
  }
}

if (pairs.length < 300) throw new Error(`Esperava ~400 pares, obtive ${pairs.length}. Página mudou?`);

writeJson(p('data/raw/ptbr/coelhonews-pairs.json'), {
  source: URL,
  title: 'Master Sword agora é Espada Mestra! Lista de todos os termos traduzidos para Português em Zelda BotW e TotK',
  author: 'Gomyde (Colaborador), Coelho News',
  published: '2025-06-04',
  fetched_at: new Date().toISOString(),
  reliability:
    'Fonte secundária: transcrição de nomes da localização oficial PT-BR. Contém erros de digitação conhecidos; ver overrides.',
  count: pairs.length,
  pairs,
});
log(`coelhonews: ${pairs.length} pares EN→PT-BR`);
