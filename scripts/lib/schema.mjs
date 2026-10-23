// Esquema das fichas redigidas (data/content/<id>.json) e vocabulários controlados.
// Usado pelo validador, pelo build de dados e pela interface (via src/generated).

export const ACTIONS = {
  largar: 'Largar no chão',
  arremessar: 'Arremessar',
  golpe_arma: 'Acertar com arma',
  flecha: 'Acertar com flecha comum',
  fogo: 'Aplicar fogo',
  gelo: 'Aplicar gelo',
  eletricidade: 'Aplicar eletricidade',
  raio: 'Raios em tempestade',
  agua: 'Expor à água',
  chuva: 'Expor à chuva',
  calor_extremo: 'Calor extremo',
  frio_extremo: 'Frio extremo',
  fogueira: 'Colocar perto de fogueira',
  explosao: 'Aplicar explosão',
  bomba_remota: 'Usar Bomba remota',
  magnetis: 'Usar Magnétis',
  estatis: 'Usar Estátis',
  gelitis: 'Usar Gelítis',
  vento: 'Correntes de vento',
  cozinhar: 'Cozinhar',
  misturar: 'Misturar com outros ingredientes',
  comer: 'Comer / consumir',
  vender: 'Vender ou trocar',
  monstros: 'Interagir com monstros',
  cenario: 'Interagir com o cenário',
  aproximar: 'Aproximar-se',
  montar: 'Montar / domar',
  equipar: 'Equipar / vestir',
  usar: 'Usar (função principal)',
  defender: 'Defender / aparar',
};

export const STATUSES = {
  confirmado: 'Confirmado',
  sem_efeito: 'Sem efeito',
  nao_aplicavel: 'Não aplicável',
  desconhecido: 'Desconhecido',
};

export const KINDS = {
  mecanica: 'Mecânica confirmada',
  curiosidade: 'Curiosidade',
  tecnica_avancada: 'Técnica avançada',
  glitch: 'Glitch',
  nao_verificado: 'Informação não verificada',
};

/** Capacidades usadas pela navegação inversa do Laboratório. */
export const CAPABILITIES = {
  gera_fogo: 'Pode gerar ou espalhar fogo',
  gera_gelo: 'Pode gerar gelo ou congelar',
  gera_eletricidade: 'Pode gerar descargas elétricas',
  gera_explosao: 'Pode causar explosões',
  congela_inimigos: 'Pode congelar inimigos',
  queima_inimigos: 'Pode incendiar inimigos',
  eletrocuta_inimigos: 'Pode eletrocutar inimigos',
  inflamavel: 'Pega fogo / queima',
  conduz_eletricidade: 'Conduz eletricidade (metal)',
  atrai_raios: 'Atrai raios em tempestades',
  magnetico: 'Pode ser movido com Magnétis',
  flutua: 'Flutua na água',
  faz_flutuar: 'Faz objetos flutuarem no ar',
  reage_fogo: 'Reage ou se transforma com fogo',
  reage_gelo: 'Reage ou se transforma com gelo/frio',
  reage_eletricidade: 'Reage ou se transforma com eletricidade',
  ilumina: 'Emite luz',
  cura: 'Recupera corações',
  vigor: 'Recupera ou amplia o vigor',
  protege_calor: 'Protege do calor',
  protege_frio: 'Protege do frio',
  protege_choque: 'Protege de choques',
  protege_fogo: 'Protege de chamas / queimaduras',
  furtividade: 'Aumenta a furtividade',
  velocidade: 'Aumenta a velocidade',
  ataque: 'Aumenta o ataque',
  defesa: 'Aumenta a defesa',
  reflete_laser: 'Pode refletir lasers de Guardiões',
  arremessavel: 'Pode ser arremessado com efeito',
  montavel: 'Pode ser montado',
  habilidade_especial: 'Possui habilidade ou comportamento especial',
  revela_recursos: 'Revela segredos ou recursos',
  vence_rapido: 'Pode ser derrotado de forma não óbvia',
  item_de_missao: 'Usado em missões',
};

export const VERIFICATION = {
  verificado: 'Verificado em fonte',
  parcial: 'Parcialmente verificado',
  a_verificar: 'Necessita verificação',
};

/** Frases genéricas proibidas (conteúdo de enchimento). Comparação sem acentos e minúsculas. */
export const BANNED_PHRASES = [
  'material coletavel que pode ser utilizado em receitas',
  'criatura encontrada em hyrule, util para missoes',
  'monstro que pode ser derrotado para obter materiais',
  'item util para diversas situacoes',
  'pode ser usado de varias formas',
  'lorem ipsum',
  'informacao em breve',
  'a definir',
];

export const SOURCE_KEY_RE = /^(zw|zw:.+|comp|jogo|dm|cn|teste:.+)$/;

const isStr = (x) => typeof x === 'string' && x.trim().length > 0;
const strip = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Valida uma ficha. Devolve { errors: string[], warnings: string[] }.
 * ctx: { ids: Set<string>, entity, expectedActions: string[] }
 */
export function validateContent(c, ctx) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  if (!c || typeof c !== 'object') return { errors: ['ficha não é um objeto'], warnings };
  if (!ctx.ids.has(c.id)) err(`id desconhecido: ${c.id}`);
  for (const f of ['summary', 'description']) if (!isStr(c[f])) err(`campo obrigatório vazio: ${f}`);
  if (isStr(c.summary) && c.summary.length > 260) warn(`summary longo (${c.summary.length} caracteres; ideal ≤ 220)`);
  if (isStr(c.description) && c.description.length < 120) warn('description curta (< 120 caracteres)');
  for (const f of ['locations', 'obtaining', 'uses', 'effects', 'advanced_uses', 'limitations']) {
    if (c[f] !== undefined && (!Array.isArray(c[f]) || c[f].some((x) => !isStr(x)))) err(`${f} deve ser lista de textos`);
  }
  const sourceKeysOk = (arr, where) => {
    if (!Array.isArray(arr) || !arr.length) {
      err(`${where}: sem fontes`);
      return;
    }
    for (const s of arr) if (!SOURCE_KEY_RE.test(s)) err(`${where}: chave de fonte inválida "${s}"`);
  };
  if (!Array.isArray(c.interactions)) err('interactions deve ser lista');
  else {
    const seen = new Set();
    for (const [i, it] of c.interactions.entries()) {
      const w = `interactions[${i}] (${it.action})`;
      if (!ACTIONS[it.action]) err(`${w}: ação inválida`);
      if (seen.has(it.action + '|' + (it.variant ?? ''))) warn(`${w}: ação repetida — use "variant" para distinguir`);
      seen.add(it.action + '|' + (it.variant ?? ''));
      if (!STATUSES[it.status]) err(`${w}: status inválido "${it.status}"`);
      if (!isStr(it.result)) err(`${w}: result vazio`);
      if (it.kind !== undefined && !KINDS[it.kind]) err(`${w}: kind inválido`);
      if (it.status === 'confirmado' || it.status === 'sem_efeito') sourceKeysOk(it.sources, w);
      for (const f of ['conditions', 'side_effects', 'applications', 'produces']) {
        if (it[f] !== undefined && (!Array.isArray(it[f]) || it[f].some((x) => !isStr(x)))) err(`${w}: ${f} deve ser lista de textos`);
      }
      for (const pid of it.produces ?? []) if (!ctx.ids.has(pid)) err(`${w}: produces aponta para id inexistente ${pid}`);
    }
    for (const a of ctx.expectedActions ?? []) if (!seen.has(a + '|')) {
      if (![...seen].some((k) => k.startsWith(a + '|'))) warn(`ação esperada não avaliada: ${a}`);
    }
  }
  if (!Array.isArray(c.secrets)) err('secrets deve ser lista (pode ser vazia, com no_secrets_note)');
  else {
    for (const [i, s] of c.secrets.entries()) {
      if (!KINDS[s.kind]) err(`secrets[${i}]: kind inválido`);
      if (!isStr(s.title) || !isStr(s.text)) err(`secrets[${i}]: title/text vazios`);
      if (s.kind !== 'nao_verificado') sourceKeysOk(s.sources, `secrets[${i}]`);
    }
    if (!c.secrets.length && !isStr(c.no_secrets_note)) warn('sem segredos e sem no_secrets_note explicando a ausência');
  }
  if (c.related !== undefined) {
    if (!Array.isArray(c.related)) err('related deve ser lista');
    else
      for (const r of c.related) {
        if (!ctx.ids.has(r.id)) err(`related aponta para id inexistente: ${r.id}`);
        if (r.id === c.id) err('related aponta para a própria ficha');
        if (!isStr(r.relation)) err(`related ${r.id}: relation vazia`);
      }
  }
  if (c.capabilities !== undefined) {
    if (!Array.isArray(c.capabilities)) err('capabilities deve ser lista');
    else for (const cap of c.capabilities) if (!CAPABILITIES[cap]) err(`capability inválida: ${cap}`);
  }
  if (!VERIFICATION[c.verification_status]) err(`verification_status inválido: ${c.verification_status}`);
  if (c.extra_sources !== undefined) {
    for (const [k, v] of Object.entries(c.extra_sources)) {
      if (!SOURCE_KEY_RE.test(k)) err(`extra_sources: chave inválida ${k}`);
      if (!isStr(v?.title)) err(`extra_sources.${k}: title vazio`);
    }
  }
  const allText = strip(JSON.stringify(c));
  for (const b of BANNED_PHRASES) if (allText.includes(b)) err(`frase genérica proibida: "${b}"`);
  // \b evita falsos positivos como "confusão" (que contém "fusao")
  if (/\btotk\b|tears of the kingdom|ultrahand|ultramao|\bfuse\b|\bfusao\b/i.test(allText.replace(/"name_en"[^,]*/g, '')))
    warn('menciona TOTK/mecânicas de TOTK — confirme que é apenas uma ressalva comparativa');
  return { errors, warnings };
}

/** Ações que devem ser avaliadas (com qualquer status) por tipo de entidade. */
export function expectedActionsFor(entity) {
  const t = entity.type;
  const sub = entity.subcategory;
  if (t === 'material') {
    const base = ['largar', 'golpe_arma', 'fogo', 'fogueira', 'gelo', 'eletricidade', 'agua', 'magnetis', 'estatis', 'cozinhar', 'vender'];
    if (['frutas', 'cogumelos', 'vegetais', 'ervas_e_flores', 'carnes', 'ingredientes'].includes(sub)) base.push('comer', 'frio_extremo');
    return base;
  }
  if (t === 'creature') {
    if (['peixes', 'insetos', 'anfibios_e_repteis', 'frutos_do_mar'].includes(sub)) return ['aproximar', 'largar', 'cozinhar', 'comer', 'vender', 'fogo', 'eletricidade'];
    if (sub === 'montarias') return ['aproximar', 'montar', 'golpe_arma', 'flecha', 'fogo', 'eletricidade', 'estatis'];
    return ['aproximar', 'golpe_arma', 'flecha', 'fogo', 'eletricidade', 'estatis', 'montar'];
  }
  if (t === 'monster') return ['golpe_arma', 'flecha', 'fogo', 'gelo', 'eletricidade', 'agua', 'explosao', 'bomba_remota', 'estatis', 'magnetis', 'cenario'];
  if (t === 'weapon') return ['usar', 'arremessar', 'fogo', 'eletricidade', 'raio', 'agua', 'magnetis', 'monstros'];
  if (t === 'shield') return ['defender', 'usar', 'fogo', 'eletricidade', 'raio', 'agua', 'magnetis'];
  if (t === 'bow') return ['usar', 'fogo', 'eletricidade', 'raio', 'agua', 'magnetis'];
  if (t === 'arrow') return ['usar', 'fogo', 'gelo', 'eletricidade', 'agua', 'chuva', 'monstros', 'cenario'];
  if (t === 'armor') return ['equipar', 'fogo', 'raio', 'eletricidade', 'calor_extremo', 'frio_extremo'];
  if (t === 'armor_set') return ['equipar'];
  if (t === 'food' || t === 'elixir') return ['comer', 'vender'];
  if (t === 'rune' || t === 'ability') return ['usar'];
  if (t === 'key_item') return ['usar'];
  return [];
}
