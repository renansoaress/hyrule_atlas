# Fontes e créditos — Hyrule Atlas

> The Legend of Zelda: Breath of the Wild, seus nomes, textos, imagens e marcas são © Nintendo. O Hyrule Atlas é um projeto de fã, pessoal, educacional e sem fins comerciais, sem afiliação com a Nintendo.

## Fontes de dados

| Fonte | O que forneceu | Licença / condição |
|---|---|---|
| [Hyrule Compendium API](https://github.com/gadhagod/Hyrule-Compendium-API) (gadhagod) | 394 entradas do compendium de BOTW (incl. Modo Mestre): textos oficiais em inglês, locais comuns, drops, corações, efeitos culinários, fotos | Código MIT; textos e imagens © Nintendo |
| [Zelda Wiki](https://zeldawiki.wiki) | Listas de equipamentos, armaduras e níveis, tabelas de materiais e pratos, itens-chave, parâmetros extraídos do jogo, 1277 páginas consultadas (somente seções de BOTW), ícones, modelos e capturas | Texto: GNU Free Documentation License 1.3. Imagens: © Nintendo, publicadas sob alegação de uso justo |
| [Coelho News](https://coelhonews.com/guias/traducoes-em-portugues-de-zelda-botw-e-totk-o-que-mudou-nos-jogos) — Gomyde (Colaborador), Coelho News, 2025-06-04 | 429 pares de nomes EN → PT-BR da localização oficial (fonte secundária; erros de digitação corrigidos e documentados em `data/glossary/ptbr-overrides.json`) | Nomes © Nintendo; usados como referência terminológica |
| Texto do jogo (citado nas fontes acima) | Descrições de inventário e do compendium, falas usadas como evidência | © Nintendo — citações curtas para referência |

Cada ficha lista, na seção "Fontes utilizadas", as páginas exatas consultadas (com links). As afirmações sobre mecânicas citam a chave da fonte junto à interação ou ao segredo.

## Imagens

Total de imagens creditadas: **2490** (detalhe por arquivo em [creditos-imagens.csv](creditos-imagens.csv)).

| Origem | Imagens |
|---|---:|
| Hyrule Compendium API | 389 |
| Zelda Wiki | 2101 |

| Tipo | Imagens |
|---|---:|
| Variante de tingimento | 765 |
| Ícone de inventário | 686 |
| Modelo 3D do jogo | 557 |
| Foto do Hyrule Compendium | 394 |
| Captura do jogo | 29 |
| Composição dos ícones oficiais das peças | 27 |
| Arte oficial | 20 |
| Render oficial | 12 |

**Direitos de uso.** Todas as imagens são reais, extraídas do jogo, e pertencem à Nintendo. Nem a Hyrule Compendium API nem o Zelda Wiki concedem licença de redistribuição dessas imagens: o Zelda Wiki as marca como "Copyright" e as publica sob alegação de uso justo. Elas foram incluídas para uso pessoal e educacional, offline e sem fins comerciais. **Antes de publicar ou redistribuir o atlas, avalie os direitos** — para uma versão pública, rode o build sem imagens ou substitua-as por material com licença adequada.

As imagens foram convertidas para WebP e redimensionadas (`scripts/images/optimize-images.mjs`). As imagens principais dos conjuntos de armadura são composições automáticas dos ícones oficiais das peças.

## Fonte tipográfica

- **Cinzel** — The Cinzel Project Authors, SIL Open Font License 1.1 (`src/assets/fonts/Cinzel-OFL.txt`). Embutida no build; nenhuma fonte é carregada da internet.

## Bibliotecas

| Pacote | Versão | Licença | Uso |
|---|---|---|---|
| react | ^18.3.1 | MIT | incluída no app |
| react-dom | ^18.3.1 | MIT | incluída no app |
| @playwright/test | ^1.49.1 | Apache-2.0 | build/testes |
| @testing-library/react | ^16.1.0 | MIT | build/testes |
| @types/node | ^22.10.1 | MIT | build/testes |
| @types/react | ^18.3.12 | MIT | build/testes |
| @types/react-dom | ^18.3.1 | MIT | build/testes |
| @vitejs/plugin-react | ^4.3.4 | MIT | build/testes |
| fflate | ^0.8.2 | MIT | build/testes |
| jsdom | ^25.0.1 | MIT | build/testes |
| sharp | ^0.33.5 | Apache-2.0 | build/testes |
| typescript | ^5.6.3 | Apache-2.0 | build/testes |
| vite | ^5.4.11 | MIT | build/testes |
| vitest | ^2.1.8 | MIT | build/testes |

