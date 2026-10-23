// Relatório de cobertura: compara o atlas com o inventário de referência e resume, por categoria,
// fichas completas, parciais e que necessitam verificação. Saídas: reports/cobertura.md e reports/cobertura.json
import fs from 'node:fs';
import { readJson, writeJson, writeText, p, log, listFiles } from '../lib/util.mjs';

const atlas = readJson(p('src/generated/atlas.json'));
const inv = readJson(p('data/inventory/inventory.json'));
const conflicts = readJson(p('data/inventory/conflicts.json'), []);
const namesReport = readJson(p('data/glossary/names-report.json'), { conflicts: [] });
const E = atlas.entities;

const cats = atlas.categories.map((c) => {
  const list = E.filter((e) => e.category === c.key);
  const ref = inv.filter((e) => e.category === c.key).length;
  const st = (s) => list.filter((e) => e.verification_status === s);
  const inter = list.flatMap((e) => e.interactions);
  const secrets = list.flatMap((e) => e.secrets);
  return {
    key: c.key,
    label: c.label,
    referencia: ref,
    no_atlas: list.length,
    redigidas: list.filter((e) => e.content_status === 'redigida').length,
    verificadas: st('verificado').length,
    parciais: st('parcial').length,
    a_verificar: st('a_verificar').length,
    interacoes: inter.length,
    interacoes_por_status: Object.fromEntries(['confirmado', 'sem_efeito', 'nao_aplicavel', 'desconhecido'].map((s) => [s, inter.filter((i) => i.status === s).length])),
    segredos: secrets.length,
    segredos_por_tipo: Object.fromEntries(['mecanica', 'curiosidade', 'tecnica_avancada', 'glitch', 'nao_verificado'].map((k) => [k, secrets.filter((s) => s.kind === k).length])),
    nomes: Object.fromEntries(['oficial', 'oficial_secundaria', 'nao_oficial'].map((s) => [s, list.filter((e) => e.name_status === s).length])),
    imagens_principais: Object.fromEntries([...new Set(list.map((e) => e.image.main_role))].map((r) => [r, list.filter((e) => e.image.main_role === r).length])),
    ids_parciais: st('parcial').map((e) => e.id),
    ids_a_verificar: st('a_verificar').map((e) => e.id),
    ids_pendentes: list.filter((e) => e.content_status !== 'redigida').map((e) => e.id),
  };
});
const tot = (k) => cats.reduce((n, c) => n + c[k], 0);
const totals = {
  referencia: tot('referencia'),
  no_atlas: tot('no_atlas'),
  redigidas: tot('redigidas'),
  verificadas: tot('verificadas'),
  parciais: tot('parciais'),
  a_verificar: tot('a_verificar'),
  interacoes: tot('interacoes'),
  segredos: tot('segredos'),
};
const interStatus = Object.fromEntries(['confirmado', 'sem_efeito', 'nao_aplicavel', 'desconhecido'].map((s) => [s, cats.reduce((n, c) => n + c.interacoes_por_status[s], 0)]));
const validation = readJson(p('reports/validacao.json'), null);
const e2e = readJson(p('reports/e2e-results.json'), null);
const lotes = listFiles(p('reports/lotes'), '.md').map((f) => f.split(/[\\/]/).pop());

writeJson(p('reports/cobertura.json'), { generated_at: new Date().toISOString(), totals, interacoes_por_status: interStatus, categorias: cats, conflitos_inventario: conflicts, conflitos_nomes: namesReport.conflicts });

const name = (id) => E.find((e) => e.id === id)?.name_ptbr ?? id;
const md = [];
md.push('# Relatório de cobertura — Hyrule Atlas', '');
md.push(`Gerado em ${new Date().toLocaleString('pt-BR')} a partir de \`src/generated/atlas.json\`.`, '');
md.push('## Resumo', '');
md.push(`- **${totals.no_atlas}** registros no atlas para **${totals.referencia}** entidades no inventário de referência (${totals.no_atlas === totals.referencia ? 'cobertura total' : 'DIFERENÇA — ver abaixo'}).`);
md.push(`- Fichas redigidas: **${totals.redigidas}** (${((totals.redigidas / totals.no_atlas) * 100).toFixed(1)}%).`);
md.push(`- Verificadas: **${totals.verificadas}** · parciais: **${totals.parciais}** · necessitam verificação: **${totals.a_verificar}**.`);
md.push(`- Interações documentadas: **${totals.interacoes}** (confirmadas ${interStatus.confirmado}, sem efeito ${interStatus.sem_efeito}, não aplicáveis ${interStatus.nao_aplicavel}, desconhecidas ${interStatus.desconhecido}).`);
md.push(`- Segredos, curiosidades e mecânicas especiais: **${totals.segredos}**.`);
md.push(`- Nomes PT-BR: oficiais (fonte primária) ${atlas.meta.name_status.oficial}, oficiais (fonte secundária) ${atlas.meta.name_status.oficial_secundaria}, traduções não oficiais ${atlas.meta.name_status.nao_oficial}.`);
if (validation) md.push(`- Última validação: ${validation.errors.length} erros, ${validation.warnings.length} avisos (\`reports/validacao.json\`).`);
if (e2e?.stats) md.push(`- Últimos testes E2E: ${e2e.stats.expected} aprovados, ${e2e.stats.unexpected} falhas, ${e2e.stats.flaky} instáveis (\`reports/e2e-results.json\`).`);
md.push('');
md.push('## Por categoria', '');
md.push('| Categoria | Referência | No atlas | Redigidas | Verificadas | Parciais | A verificar | Interações | Segredos |');
md.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const c of cats) md.push(`| ${c.label} | ${c.referencia} | ${c.no_atlas} | ${c.redigidas} | ${c.verificadas} | ${c.parciais} | ${c.a_verificar} | ${c.interacoes} | ${c.segredos} |`);
md.push(`| **Total** | **${totals.referencia}** | **${totals.no_atlas}** | **${totals.redigidas}** | **${totals.verificadas}** | **${totals.parciais}** | **${totals.a_verificar}** | **${totals.interacoes}** | **${totals.segredos}** |`, '');
md.push('**Parcial** = há interações relevantes sem fonte (marcadas como desconhecidas) ou o extrato da fonte é muito curto. **A verificar** = as fontes se contradizem; a ficha mostra as versões divergentes sem escolher um lado.', '');
md.push('## Inventário de referência', '');
md.push('Construído por `scripts/build/inventory.mjs` a partir de: Hyrule Compendium (389 entradas + 5 do Modo Mestre), listas do Zelda Wiki de armas (128), escudos (33) e arcos (26), propriedades de itens (BotWItemProperties), armaduras e níveis (Cargo: 107 peças, 27 conjuntos), tabelas de materiais e de pratos ("Materials/Food in Breath of the Wild"), itens-chave (36, com as 4 versões "+" das habilidades dos Campeões incorporadas às fichas base) e listas curadas (runas, mecânicas, objetos, Epona). Variantes de tingimento das armaduras estão incorporadas às fichas das peças (765 ícones).', '');
md.push('### Exclusões e decisões', '');
for (const c of conflicts) md.push(`- **${c.kind}** — ${c.name ?? ''}: ${c.note ?? c.reason ?? JSON.stringify(c)}`);
md.push('- Conteúdo exclusivo de Tears of the Kingdom foi descartado na extração (seções de TOTK das páginas do wiki) e na validação.', '');
md.push('## Fichas parciais e a verificar', '');
for (const c of cats) {
  if (!c.ids_parciais.length && !c.ids_a_verificar.length) continue;
  md.push(`### ${c.label}`);
  if (c.ids_a_verificar.length) md.push(`- A verificar: ${c.ids_a_verificar.map(name).join(', ')}`);
  if (c.ids_parciais.length) md.push(`- Parciais: ${c.ids_parciais.map(name).join(', ')}`);
  md.push('');
}
const pend = cats.flatMap((c) => c.ids_pendentes);
md.push('## Lacunas reais', '');
if (pend.length) md.push(`- ${pend.length} fichas ainda sem texto redigido: ${pend.map(name).join(', ')}.`);
else md.push('- Todas as entidades do inventário de referência têm ficha redigida.');
md.push(`- ${interStatus.desconhecido} interações permanecem "desconhecidas" por falta de fonte — registradas explicitamente em vez de presumidas.`);
md.push('- Vídeos locais de demonstração das interações não foram incluídos (não há acervo de vídeo com direitos de uso).');
md.push('- Nomes PT-BR sem fonte oficial localizada usam tradução própria, marcada como não oficial em cada ficha.', '');
md.push('## Conflitos encontrados nas fontes', '');
md.push(`Relatórios por lote de redação (com todas as divergências documentadas): ${lotes.map((l) => `[${l}](lotes/${l})`).join(', ')}.`, '');
if (namesReport.conflicts?.length) {
  md.push('Nomes PT-BR divergentes entre fontes:');
  for (const c of namesReport.conflicts) md.push(`- ${c.name_en}: Zelda Wiki "${c.zeldawiki}" × Coelho News "${c.coelhonews}" → usado "${c.chosen}" (fonte primária).`);
}
writeText(p('reports/cobertura.md'), md.join('\n') + '\n');
log(`cobertura: ${totals.no_atlas}/${totals.referencia} registros, ${totals.redigidas} redigidas, ${totals.verificadas} verificadas → reports/cobertura.md`);
