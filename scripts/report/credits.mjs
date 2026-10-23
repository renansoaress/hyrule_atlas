// Relatório de fontes e créditos: fontes de dados, licenças, bibliotecas e a origem de cada imagem.
// Saídas: reports/fontes-e-creditos.md e reports/creditos-imagens.csv
import fs from 'node:fs';
import { readJson, writeText, p, log, listFiles } from '../lib/util.mjs';

const atlas = readJson(p('src/generated/atlas.json'));
const E = atlas.entities;
const pkg = readJson(p('package.json'));
const pages = listFiles(p('data/raw/zeldawiki/pages'), '.json').length;
const coelho = readJson(p('data/raw/ptbr/coelhonews-pairs.json'));
const comp = readJson(p('data/raw/compendium.json'));

const rows = [];
for (const e of E) for (const c of e.image_credits) rows.push({ id: e.id, nome: e.name_ptbr, papel: c.role, uso: c.used_as, cor: c.color ?? '', credito: c.credit, licenca: c.license, origem: c.source_url, pagina: c.page_url });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const header = ['id', 'nome', 'papel', 'uso', 'cor', 'credito', 'licenca', 'origem', 'pagina'];
writeText(p('reports/creditos-imagens.csv'), '﻿' + [header.join(';'), ...rows.map((r) => header.map((h) => csvCell(r[h])).join(';'))].join('\r\n') + '\r\n');

const byOrigin = {};
for (const r of rows) {
  const k = /hyrule-compendium/.test(r.origem) ? 'Hyrule Compendium API' : /wikimg|zeldawiki/.test(r.origem) ? 'Zelda Wiki' : 'Composição a partir de ícones do Zelda Wiki';
  byOrigin[k] = (byOrigin[k] ?? 0) + 1;
}
const byRole = {};
for (const r of rows) byRole[r.papel] = (byRole[r.papel] ?? 0) + 1;
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const LICENSES = { react: 'MIT', 'react-dom': 'MIT', vite: 'MIT', '@vitejs/plugin-react': 'MIT', typescript: 'Apache-2.0', vitest: 'MIT', '@playwright/test': 'Apache-2.0', sharp: 'Apache-2.0', fflate: 'MIT', jsdom: 'MIT', '@testing-library/react': 'MIT', '@types/react': 'MIT', '@types/react-dom': 'MIT', '@types/node': 'MIT' };
const bundled = ['react', 'react-dom'];

const md = [];
md.push('# Fontes e créditos — Hyrule Atlas', '');
md.push('> The Legend of Zelda: Breath of the Wild, seus nomes, textos, imagens e marcas são © Nintendo. O Hyrule Atlas é um projeto de fã, pessoal, educacional e sem fins comerciais, sem afiliação com a Nintendo.', '');
md.push('## Fontes de dados', '');
md.push('| Fonte | O que forneceu | Licença / condição |', '|---|---|---|');
md.push(`| [Hyrule Compendium API](https://github.com/gadhagod/Hyrule-Compendium-API) (gadhagod) | ${comp.count} entradas do compendium de BOTW (incl. Modo Mestre): textos oficiais em inglês, locais comuns, drops, corações, efeitos culinários, fotos | Código MIT; textos e imagens © Nintendo |`);
md.push(`| [Zelda Wiki](https://zeldawiki.wiki) | Listas de equipamentos, armaduras e níveis, tabelas de materiais e pratos, itens-chave, parâmetros extraídos do jogo, ${pages} páginas consultadas (somente seções de BOTW), ícones, modelos e capturas | Texto: GNU Free Documentation License 1.3. Imagens: © Nintendo, publicadas sob alegação de uso justo |`);
md.push(`| [Coelho News](${coelho.source}) — ${coelho.author}, ${coelho.published} | ${coelho.count} pares de nomes EN → PT-BR da localização oficial (fonte secundária; erros de digitação corrigidos e documentados em \`data/glossary/ptbr-overrides.json\`) | Nomes © Nintendo; usados como referência terminológica |`);
md.push('| Texto do jogo (citado nas fontes acima) | Descrições de inventário e do compendium, falas usadas como evidência | © Nintendo — citações curtas para referência |', '');
md.push('Cada ficha lista, na seção "Fontes utilizadas", as páginas exatas consultadas (com links). As afirmações sobre mecânicas citam a chave da fonte junto à interação ou ao segredo.', '');
md.push('## Imagens', '');
md.push(`Total de imagens creditadas: **${rows.length}** (detalhe por arquivo em [creditos-imagens.csv](creditos-imagens.csv)).`, '');
md.push('| Origem | Imagens |', '|---|---:|');
for (const [k, v] of Object.entries(byOrigin)) md.push(`| ${k} | ${v} |`);
md.push('', '| Tipo | Imagens |', '|---|---:|');
for (const [k, v] of Object.entries(byRole).sort((a, b) => b[1] - a[1])) md.push(`| ${k} | ${v} |`);
md.push('');
md.push('**Direitos de uso.** Todas as imagens são reais, extraídas do jogo, e pertencem à Nintendo. Nem a Hyrule Compendium API nem o Zelda Wiki concedem licença de redistribuição dessas imagens: o Zelda Wiki as marca como "Copyright" e as publica sob alegação de uso justo. Elas foram incluídas para uso pessoal e educacional, offline e sem fins comerciais. **Antes de publicar ou redistribuir o atlas, avalie os direitos** — para uma versão pública, rode o build sem imagens ou substitua-as por material com licença adequada.', '');
md.push('As imagens foram convertidas para WebP e redimensionadas (`scripts/images/optimize-images.mjs`). As imagens principais dos conjuntos de armadura são composições automáticas dos ícones oficiais das peças.', '');
md.push('## Fonte tipográfica', '');
md.push('- **Cinzel** — The Cinzel Project Authors, SIL Open Font License 1.1 (`src/assets/fonts/Cinzel-OFL.txt`). Embutida no build; nenhuma fonte é carregada da internet.', '');
md.push('## Bibliotecas', '');
md.push('| Pacote | Versão | Licença | Uso |', '|---|---|---|---|');
for (const [k, v] of Object.entries(deps)) md.push(`| ${k} | ${v} | ${LICENSES[k] ?? 'ver pacote'} | ${bundled.includes(k) ? 'incluída no app' : 'build/testes'} |`);
md.push('');
writeText(p('reports/fontes-e-creditos.md'), md.join('\n') + '\n');
log(`créditos: ${rows.length} imagens → reports/fontes-e-creditos.md e reports/creditos-imagens.csv`);
