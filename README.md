# Hyrule Atlas

Enciclopédia interativa e **100% offline** de *The Legend of Zelda: Breath of the Wild* (BOTW), em português
brasileiro. Reúne as 878 entidades do jogo, incluindo itens, equipamentos, armaduras, materiais, pratos,
criaturas, monstros, runas, mecânicas e objetos. Cada ficha traz imagens reais, dados extraídos do jogo,
interações verificadas, segredos e as fontes rastreáveis de cada afirmação.

## Como usar

**No navegador:** <https://botw.renans.dev>

**Sem internet**, baixe uma das versões offline (também geradas por `npm run build` em `release/`):

| Distribuição | Arquivo | Quando usar |
|---|---|---|
| Arquivo único | [Hyrule-Atlas-Offline.html](https://botw.renans.dev/downloads/Hyrule-Atlas-Offline.html) (~24 MB) | Basta dar dois cliques. Tudo (código, dados, fonte e ~2.500 imagens) está embutido nele. |
| Pasta (ZIP) | [Hyrule-Atlas-Offline.zip](https://botw.renans.dev/downloads/Hyrule-Atlas-Offline.zip) (~21 MB) | Descompacte e abra o `index.html`. Carrega mais rápido, porque as imagens ficam em arquivos separados, e a galeria tem as imagens maiores. |

As duas abrem por `file://` no Chrome, no Edge e no Firefox, sem servidor. Favoritos e preferências ficam
no `localStorage` do próprio navegador.

### O que tem

- **Catálogo**: busca em português ou inglês, sem diferenciar acentos (`geleca`, `Chuchu Jelly`, `silex`, `congela`, `Magnétis`). Também há filtros por categoria e subcategoria, por efeitos especiais, interações elementais, curiosidades e DLC/amiibo/Modo Mestre, além de ordenação (nome, categoria, nº do compendium, ataque, defesa), favoritos e o botão "carregar mais". Atalho `/` foca a busca.
- **Ficha detalhada**, com as seções:
  - imagem e galeria (ícone, modelo, captura e variantes de tingimento);
  - nome PT-BR com o status do nome, nome original, categoria e dados do jogo;
  - descrição, onde encontrar, como obter, lojas, para que serve e efeitos;
  - interações possíveis, com status (confirmado, sem efeito, não aplicável ou desconhecido), condições, efeitos secundários, aplicações e fontes;
  - segredos, curiosidades e mecânicas especiais, classificados em mecânica, curiosidade, técnica avançada, glitch ou não verificado;
  - usos avançados, receitas, melhorias de armadura nível a nível, modificadores possíveis, drops e restrições;
  - itens relacionados e fontes utilizadas.

  A ficha fecha com Escape, com o botão de fechar ou com um clique fora dela.
- **Laboratório de Hyrule**: escolha um item e uma ação (aplicar fogo, gelo, eletricidade, golpear, Magnétis, Estátis, cozinhar…) para ver o resultado documentado. A navegação inversa responde a perguntas como "Quais itens podem gerar fogo?", "Quais objetos podem flutuar?" e "Quais materiais reagem à eletricidade?". Também filtra por capacidade ou por ação confirmada.
- **Fontes e cobertura**: cobertura por categoria, critérios de verificação, política de nomes e direitos das imagens.

## Nomes em português

BOTW ganhou localização oficial em PT-BR em 05/06/2025. Os nomes do atlas seguem esta prioridade:

1. **Oficial** (99): citações do jogo registradas no Zelda Wiki (*Nomenclature*, ptB).
2. **Oficial — fonte secundária** (337): a lista da localização oficial publicada pela Coelho News. A grafia foi normalizada para o padrão do jogo (minúsculas, exceto nomes próprios: "Escudo hyliano", "Bomba remota"). Os erros de digitação da lista foram corrigidos e documentados em `data/glossary/ptbr-overrides.json`.
3. **Tradução não oficial** (442): tradução própria, consistente com os nomes oficiais dos componentes (ex.: "Koboblin azul" segue "Koboblin"; "Curry de carne de segunda" segue "Carne de segunda").

Cada ficha mostra o status do nome e a fonte. O nome em inglês fica sempre visível e também serve para a busca.

## Desenvolvimento

Requisitos: Node.js 20 ou mais recente. O Chrome e/ou o Edge instalados são usados nos testes E2E.

```bash
npm install
npm run dev            # servidor de desenvolvimento (Vite)
npm run build          # dados -> validação -> typecheck -> build -> distribuição offline -> relatórios
npm test               # testes unitários (Vitest)
npm run test:e2e       # testes de ponta a ponta na versão DISTRIBUÍDA (Playwright, Chrome + Edge, file://, offline)
```

Todos os passos também rodam só com `node`, sem `npm` (útil se a instalação global do npm estiver com problema):

```bash
node scripts/build-all.mjs                        # build completo (aceita --strict)
node node_modules/vitest/vitest.mjs run           # testes unitários
node node_modules/@playwright/test/cli.js test    # testes E2E
```

### Estrutura

```
data/
  raw/                 fontes importadas (compendium, tabelas Cargo e páginas do Zelda Wiki, pares PT-BR, imagens originais)
  inventory/           inventário de referência, curadoria (curated.json), extratos e manifesto de imagens
  glossary/            nomes PT-BR resolvidos, correções, traduções não oficiais e termos
  sources/             pacote de fontes por entidade (somente BOTW) e referências gerais de mecânicas (_ref/)
  content/             878 fichas redigidas em PT-BR (uma por entidade, JSON)
docs/GUIA-DE-CONTEUDO.md   esquema das fichas e regras de redação/verificação
scripts/
  import/              importação das fontes (compendium, Cargo, páginas, nomes PT-BR)
  build/               inventário, nomes, pacotes de fontes e geração do atlas.json
  images/              coleta (com origem/licença) e otimização para WebP
  validate/            validação de fichas e da base/distribuição
  offline/             geração da pasta, do ZIP e do HTML único
  report/              relatórios de cobertura e de fontes/créditos
  tools/wiki-botw.mjs  pesquisa no Zelda Wiki mostrando só o conteúdo de BOTW
src/                   aplicação React + TypeScript (dados em src/generated/atlas.json)
public/assets/img/     imagens otimizadas (principal, miniatura, ícone, tingimentos, extras)
tests/unit, tests/e2e  testes
reports/               cobertura, fontes e créditos, validação, resultados E2E e relatórios por lote
release/               distribuição offline
```

Num clone novo, `npm run build` (ou `npm run dados`) gera `src/generated/atlas.json`, que não vai para o
git; `npm run dev` e `npm test` já fazem isso antes de rodar.

### Publicação

O site em <https://botw.renans.dev> é publicado como o ReSo:

```bash
npm run deploy          # envia a release atual
npm run deploy:build    # build completo e depois envia
```

O `scripts/deploy/deploy.mjs` faz quatro coisas:

- empacota `release/Hyrule-Atlas-Offline/` com os dois downloads e envia por `scp` para uma pasta de chegada;
- troca a pasta publicada (`~/projects/botw_web`) de uma vez;
- reinicia o `botw_web.service`, um servidor Python que escuta só em `127.0.0.1:5510`;
- confere se o site respondeu.

Na primeira execução ele também instala o serviço, o site do nginx (`scripts/deploy/nginx-botw.conf`,
com gzip) e o certificado HTTPS (certbot).

O servidor não fica no repositório: copie `scripts/deploy/deploy.example.json` para
`scripts/deploy/deploy.local.json` e preencha (o git ignora esse arquivo).

### Atualizar os dados (requer internet)

```bash
npm run import:fontes   # Hyrule Compendium API, tabelas Cargo do Zelda Wiki, nomes PT-BR
npm run inventario      # inventário de referência + páginas do Zelda Wiki + pacotes de fontes
npm run imagens         # imagens reais (compendium + Zelda Wiki) -> WebP
npm run build
```

As fichas em `data/content` são escritas à mão (veja `docs/GUIA-DE-CONTEUDO.md`) e validadas por
`node scripts/validate/content.mjs`. O validador recusa:

- textos genéricos;
- interações confirmadas sem fonte;
- fontes que não estão em cache;
- ids inexistentes;
- vocabulário fora do padrão.

Ele também alerta sobre menções a TOTK.

## Garantias verificadas

- Nenhum recurso remoto é necessário. O validador `--dist` confere scripts, estilos e imagens, e os testes E2E rodam com a rede desligada e falham se houver qualquer requisição que não seja `file:` ou `data:`.
- O script é IIFE clássico, porque módulos ES são bloqueados em `file://`, e todos os caminhos são relativos.
- Não há ids duplicados, imagens ausentes nem relações quebradas (testes unitários e de validação).
- Nenhum erro de console no Chrome nem no Edge (testes E2E).

## Direitos e créditos

The Legend of Zelda e todos os nomes, textos e imagens do jogo são © Nintendo. Este é um projeto de fã,
pessoal, educacional e sem fins comerciais. As imagens vieram da Hyrule Compendium API e do Zelda Wiki
(que as publica sob alegação de uso justo). **Não há licença de redistribuição dessas imagens**: avalie os
direitos antes de publicar o atlas. O texto do Zelda Wiki está sob GNU FDL 1.3. A fonte Cinzel está sob
SIL OFL 1.1. Detalhes em [`reports/fontes-e-creditos.md`](reports/fontes-e-creditos.md) e
[`reports/creditos-imagens.csv`](reports/creditos-imagens.csv). A cobertura está em
[`reports/cobertura.md`](reports/cobertura.md).
