# Relatório de cobertura — Hyrule Atlas

Gerado em 23/10/2026, 20:06:03 a partir de `src/generated/atlas.json`.

## Resumo

- **878** registros no atlas para **878** entidades no inventário de referência (cobertura total).
- Fichas redigidas: **878** (100.0%).
- Verificadas: **757** · parciais: **83** · necessitam verificação: **38**.
- Interações documentadas: **6902** (confirmadas 4079, sem efeito 1259, não aplicáveis 40, desconhecidas 1524).
- Segredos, curiosidades e mecânicas especiais: **1981**.
- Nomes PT-BR: oficiais (fonte primária) 99, oficiais (fonte secundária) 337, traduções não oficiais 442.
- Última validação: 0 erros, 2 avisos (`reports/validacao.json`).
- Últimos testes E2E: 48 aprovados, 0 falhas, 0 instáveis (`reports/e2e-results.json`).

## Por categoria

| Categoria | Referência | No atlas | Redigidas | Verificadas | Parciais | A verificar | Interações | Segredos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Materiais e ingredientes | 113 | 113 | 113 | 95 | 12 | 6 | 1443 | 284 |
| Armas | 128 | 128 | 128 | 117 | 1 | 10 | 1096 | 320 |
| Arcos | 26 | 26 | 26 | 24 | 2 | 0 | 183 | 66 |
| Flechas | 7 | 7 | 7 | 3 | 4 | 0 | 59 | 19 |
| Escudos | 33 | 33 | 33 | 32 | 0 | 1 | 286 | 84 |
| Armaduras e roupas | 134 | 134 | 134 | 126 | 5 | 3 | 804 | 287 |
| Pratos e elixires | 189 | 189 | 189 | 173 | 4 | 12 | 784 | 274 |
| Criaturas e montarias | 84 | 84 | 84 | 69 | 12 | 3 | 770 | 185 |
| Monstros e chefes | 86 | 86 | 86 | 51 | 35 | 0 | 1094 | 245 |
| Itens-chave | 28 | 28 | 28 | 26 | 2 | 0 | 45 | 64 |
| Runas e habilidades | 12 | 12 | 12 | 12 | 0 | 0 | 59 | 47 |
| Mecânicas | 25 | 25 | 25 | 22 | 1 | 2 | 180 | 68 |
| Objetos do cenário | 9 | 9 | 9 | 4 | 5 | 0 | 71 | 24 |
| Tesouros e depósitos | 4 | 4 | 4 | 3 | 0 | 1 | 28 | 14 |
| **Total** | **878** | **878** | **878** | **757** | **83** | **38** | **6902** | **1981** |

**Parcial** = há interações relevantes sem fonte (marcadas como desconhecidas) ou o extrato da fonte é muito curto. **A verificar** = as fontes se contradizem; a ficha mostra as versões divergentes sem escolher um lado.

## Inventário de referência

Construído por `scripts/build/inventory.mjs` a partir de: Hyrule Compendium (389 entradas + 5 do Modo Mestre), listas do Zelda Wiki de armas (128), escudos (33) e arcos (26), propriedades de itens (BotWItemProperties), armaduras e níveis (Cargo: 107 peças, 27 conjuntos), tabelas de materiais e de pratos ("Materials/Food in Breath of the Wild"), itens-chave (36, com as 4 versões "+" das habilidades dos Campeões incorporadas às fichas base) e listas curadas (runas, mecânicas, objetos, Epona). Variantes de tingimento das armaduras estão incorporadas às fichas das peças (765 ícones).

### Exclusões e decisões

- **propriedades_ignoradas** — Ancient Orb: Objeto de cenário (orbe ancestral de quebra-cabeças), não é item de inventário.
- **propriedades_ignoradas** — Horn: Corneta usada por monstros; objeto sem página de BOTW (stub), não é item de inventário.
- **dlc_divergente** — Korok Mask: {"kind":"dlc_divergente","name":"Korok Mask","lista":"TCB","pagina_do_item":"TMT","escolhido":"TMT"}
- Conteúdo exclusivo de Tears of the Kingdom foi descartado na extração (seções de TOTK das páginas do wiki) e na validação.

## Fichas parciais e a verificar

### Materiais e ingredientes
- A verificar: Noz, Cenoura tenaz, Cogumelo hyliano, Barbatana de Molduga, Energimelo, Framboesa
- Parciais: Beladona azul, Erva fogueira, Erva relampagueira, Capim hyruliano, Opala, Rubi, Safira, Princesa plácida, Fragmento de estrela, Violeta veloz, Topázio, Erva geleira

### Armas
- A verificar: Taco Kobo, Clava Kobo, Espada da Deidade Feroz, Varinha de fogo, Folha Korok, Bimerangue Lagal, Trimerangue Lagal, Espada larga do soldado, Taco Kobo pontudo, Marreta bóim
- Parciais: Obliterador

### Arcos
- Parciais: Arco da Luz, Arco do crepúsculo

### Flechas
- Parciais: Flecha explosiva, Flecha incendiária, Flecha congelante, Flecha de luz

### Escudos
- A verificar: Escudo Kobo pontudo

### Armaduras e roupas
- A verificar: Blusa Gerudo, Botas da guarda real, Camisa de Tingle
- Parciais: Camisa da lagosta insular, Camiseta Nintendo Switch, Camisa radiante, Meia-calça radiante, Máscara de Sheik

### Pratos e elixires
- A verificar: Elixir energizante, Robalo congelado, Sobrecoxa congelada, Caranguejo congelado, Tigela de arroz com carne de primeira, Crepe simples, Cenoura tenaz assada, Salmão nutritivo assado, Noz tostada, Framboesa assada, Cogumelo hyliano tostado, Energimelo tostado
- Parciais: Fritada farta de ervas, Espetinhos fartos de cogumelo, Comida duvidosa, Espetinho de carne

### Criaturas e montarias
- A verificar: Caramujo nutritivo, Urso melívoro, Búfalo-d'água
- Parciais: Escaravelho brigão, Caranguejo esperto, Libélula gélida, Burro, Libélula do relâmpago, Escaravelho vibrante, Ovelha do planalto, Escaravelho resguardado, Borboleta abrasadora, Caramujo discreto, Vaga-lume do poente, Libélula cálida

### Monstros e chefes
- Parciais: Feitiçano da nevasca, Ganon, a Calamidade, Koboblin amaldiçoado, Lagalfos amaldiçoado, Moblin amaldiçoado, Chulchul elétrico, Morci elétrico, Lagalfos elétrico, Feitiçano elétrico, Lagalfos ígneo, Chulchul ígneo, Feitiçano ígneo, Octoroc da floresta, Brita glacial, Koboblin dourado, Guardião batedor, Guardião batedor 2.0, Guardião batedor 3.0, Guardião batedor 4.0, Lagalfos glacial, Chulchul glacial, Morci glacial, Feitiçano glacial, Brita ígnea, Feitiçano meteórico, Octoroc rochoso, Sentinela, Octoroc celeste, Octoroc da neve, Stallagalfos, Stalboblin, Stalmoblin, Feitiçano do trovão, Octoroc do tesouro, Octoroc aquático

### Itens-chave
- Parciais: Envelope confidencial, Medalha de honra: Tálus

### Mecânicas
- A verificar: Lua de sangue, Eletricidade
- Parciais: Modo Trilha do Herói

### Objetos do cenário
- Parciais: Barril, Rocha, Barril explosivo, Caixa de metal, Caixa de madeira

### Tesouros e depósitos
- A verificar: Depósito de minério raro

## Lacunas reais

- Todas as entidades do inventário de referência têm ficha redigida.
- 1524 interações permanecem "desconhecidas" por falta de fonte — registradas explicitamente em vez de presumidas.
- Vídeos locais de demonstração das interações não foram incluídos (não há acervo de vídeo com direitos de uso).
- Nomes PT-BR sem fonte oficial localizada usam tradução própria, marcada como não oficial em cada ficha.

## Conflitos encontrados nas fontes

Relatórios por lote de redação (com todas as divergências documentadas): [arcos_flechas.md](lotes/arcos_flechas.md), [armaduras_cabeca.md](lotes/armaduras_cabeca.md), [armaduras_torso_pernas.md](lotes/armaduras_torso_pernas.md), [armas_duas_maos.md](lotes/armas_duas_maos.md), [armas_lancas.md](lotes/armas_lancas.md), [armas_uma_mao.md](lotes/armas_uma_mao.md), [assados_congelados.md](lotes/assados_congelados.md), [conjuntos_itens_chave.md](lotes/conjuntos_itens_chave.md), [criaturas_grandes.md](lotes/criaturas_grandes.md), [criaturas_pequenas.md](lotes/criaturas_pequenas.md), [elixires_mecanicas.md](lotes/elixires_mecanicas.md), [escudos.md](lotes/escudos.md), [materiais_diversos.md](lotes/materiais_diversos.md), [materiais_monstros_dragoes.md](lotes/materiais_monstros_dragoes.md), [materiais_vegetais.md](lotes/materiais_vegetais.md), [monstros_chefes.md](lotes/monstros_chefes.md), [monstros_comuns.md](lotes/monstros_comuns.md), [pratos_1.md](lotes/pratos_1.md), [pratos_2.md](lotes/pratos_2.md), [runas_objetos_tesouros.md](lotes/runas_objetos_tesouros.md).

Nomes PT-BR divergentes entre fontes:
- Staminoka Bass: Zelda Wiki "Robalo enérgico" × Coelho News "Robalo Energético" → usado "Robalo enérgico" (fonte primária).
