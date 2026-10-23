# Guia de redação das fichas — Hyrule Atlas

Este guia define como escrever as fichas em `data/content/<id>.json`. Os leitores são jogadores brasileiros de
**The Legend of Zelda: Breath of the Wild (BOTW)** que querem saber tudo o que dá para fazer com cada elemento do jogo.
Os números (ataque, durabilidade, defesa por nível, materiais de melhoria, preços, corações) são exibidos
automaticamente a partir dos dados estruturados — a ficha redigida acrescenta o **conhecimento**: o que o item faz,
como reage, segredos e usos.

## 1. Material de trabalho

| O quê | Onde |
|---|---|
| Lista de entidades, nomes PT-BR e status | `data/glossary/glossario.tsv` (id, nome_ptbr, status, name_en, categoria) |
| Locais e efeitos traduzidos | `data/glossary/terms-resolved.json` |
| Pacote de fontes da entidade | `data/sources/<id>.md` (fatos estruturados, compendium, citações do jogo, extrato BOTW do Zelda Wiki) |
| Referências gerais de mecânicas | `data/sources/_ref/*.md` (Fogo, Eletricidade, Magnétis, Arma, Durabilidade, Escudo, Culinária...) |
| Pesquisar outra página do Zelda Wiki | `node scripts/tools/wiki-botw.mjs "Título"` (mostra só a parte de BOTW e guarda em cache) |
| Validar fichas | `node scripts/validate/content.mjs <id> [<id>...]` |
| Fichas-modelo | `data/content/botw_material_chuchu_jelly.json`, `botw_creature_lord_of_the_mountain.json`, `botw_weapon_travelers_sword.json` |

## 2. Regras inegociáveis

1. **Somente BOTW.** As páginas do Zelda Wiki misturam Tears of the Kingdom (TOTK); o extrato já remove as seções de
   TOTK, mas desconfie de qualquer coisa sobre Fusão, Ultramão, dispositivos Zonai, Profundezas, ilhas do céu,
   Hylian Tomato etc. Nada disso existe em BOTW.
2. **Nada inventado.** Cada interação confirmada, cada "sem efeito" e cada segredo precisa de pelo menos uma chave de
   fonte. Se não há fonte, use `"status": "desconhecido"` (interações) ou `kind: "nao_verificado"` (segredos) — ou omita.
   Conhecimento próprio só entra se você o confirmar numa página do Zelda Wiki (use a ferramenta de pesquisa).
3. **Não presuma por analogia.** "Outras armas de metal conduzem eletricidade" vale porque os parâmetros da arma
   dizem `conductive: true`; não estenda regras a itens sem o dado.
4. **Sem texto genérico.** Proibido: "Material coletável que pode ser utilizado em receitas", "Criatura encontrada em
   Hyrule, útil para missões", "Monstro que pode ser derrotado para obter materiais" e equivalentes. Cada `summary` deve
   dizer algo que só vale para aquele registro. Se um item realmente não tem nada especial, diga isso explicitamente
   (ex.: "Não possui interação especial conhecida além de ser vendido") no campo `no_secrets_note`.
5. **Nomes consistentes.** Para citar outra entidade no texto, use exatamente o `nome_ptbr` do glossário. Para ligar
   fichas, use `related` com ids. Termos oficiais PT-BR que devem ser usados: Tabuleta Sheikah, Planador, Bomba remota,
   Magnétis, Estátis, Gelítis, Câmera, Santuário, Torre Sheikah, Ará/Arás (Rito), Vigor, Medidor de vigor, Lua de
   sangue, Frenesi (flurry rush), Esquiva perfeita, Defesa perfeita (parry), Surfar com escudo, Ataque-surpresa,
   Acerto crítico, Algibeira (inventário), Missão secundária, Missão de santuário, Grande Fada, Ruri (Hestu),
   Grande Árvore Deko, Espada Mestra, Koboblin, Lagalfos, Centaleão, Rinox, Octoroc, Morci, Chulchul, Feitiçano,
   Tálus, Brita, Guardião, Clã Yiga, Ganon, a Calamidade. Moeda: rupias; Mon (moeda de Kilton).
6. **Português brasileiro** natural, frases completas, sem emojis, sem marketing. Pode usar o nome em inglês entre
   parênteses quando ajudar a identificar algo sem nome PT-BR (ex.: "a loja Fang and Bone, de Kilton").
7. Não copie parágrafos inteiros das fontes: escreva com suas palavras. Citações curtas do jogo podem ir entre aspas.

## 3. Formato do arquivo

```jsonc
{
  "id": "botw_...",                 // igual ao nome do arquivo
  "summary": "...",                 // 1–2 frases (≤ 220 caracteres), usado no cartão e na busca
  "description": "...",             // 1–3 parágrafos específicos (use \n\n entre parágrafos)
  "locations": ["..."],             // onde encontrar (regiões em PT-BR do glossário de termos)
  "obtaining": ["..."],             // como obter (drops, lojas, missões, amiibo, DLC, respawn/Lua de sangue)
  "uses": ["..."],                  // para que serve (receitas, melhorias, missões, venda, combate)
  "effects": ["..."],               // efeitos ao usar/comer/vestir (ou "Nenhum efeito especial")
  "interactions": [ /* ver §4 */ ],
  "secrets": [ /* ver §5 */ ],      // pode ser [], então preencha "no_secrets_note"
  "no_secrets_note": "...",         // opcional
  "advanced_uses": ["..."],         // técnicas para jogadores experientes (com base nas fontes)
  "limitations": ["..."],           // restrições e pegadinhas
  "related": [{ "id": "botw_...", "relation": "..." }],
  "capabilities": ["..."],          // vocabulário controlado, §6
  "extra_sources": { "teste:...": { "title": "...", "url": "..." } }, // raramente necessário
  "verification_status": "verificado" // "verificado" | "parcial" | "a_verificar"
}
```

`verification_status`: **verificado** quando tudo o que é afirmado tem fonte; **parcial** quando há interações
relevantes marcadas como desconhecidas ou o extrato da fonte é muito curto; **a_verificar** quando a ficha depende de
informação conflitante.

## 4. Interações (núcleo do Laboratório de Hyrule)

Cada interação é um objeto:

```jsonc
{
  "action": "fogo",                 // vocabulário abaixo
  "variant": "arma de fogo",        // opcional, para repetir a mesma ação em condições diferentes
  "status": "confirmado",           // confirmado | sem_efeito | nao_aplicavel | desconhecido
  "result": "O que acontece (frase direta).",
  "conditions": ["Condições necessárias"],
  "side_effects": ["Efeitos secundários / cuidados"],
  "applications": ["Aplicações práticas"],
  "produces": ["botw_..."],         // ids de itens resultantes (ex.: geleca → geleca ígnea; maçã → maçã assada)
  "kind": "mecanica",               // mecanica | tecnica_avancada | glitch | curiosidade | nao_verificado
  "sources": ["zw", "zw:Fire"]
}
```

Ações: `largar`, `arremessar`, `golpe_arma`, `flecha`, `fogo`, `gelo`, `eletricidade`, `raio` (tempestade), `agua`,
`chuva`, `calor_extremo`, `frio_extremo`, `fogueira`, `explosao`, `bomba_remota`, `magnetis`, `estatis`, `gelitis`,
`vento`, `cozinhar`, `misturar`, `comer`, `vender`, `monstros`, `cenario`, `aproximar`, `montar`, `equipar`, `usar`,
`defender`.

Status:
- **confirmado** — a fonte descreve o efeito. Exige `sources`.
- **sem_efeito** — a fonte permite concluir que nada acontece (ex.: Magnétis só move metal; item não metálico). Exige `sources`.
- **nao_aplicavel** — a ação não faz sentido para o registro (ex.: "comer" uma espada; "montar" um peixe).
- **desconhecido** — nenhuma fonte esclarece. Diga isso no `result`. É melhor um "desconhecido" honesto que um palpite.

O validador avisa quando faltam as ações esperadas para o tipo (todas devem aparecer, com qualquer status):

| Tipo | Ações a avaliar |
|---|---|
| material | largar, golpe_arma, fogo, fogueira, gelo, eletricidade, agua, magnetis, estatis, cozinhar, vender (+ comer, frio_extremo para alimentos crus) |
| peixe/inseto/lagarto/sapo/caranguejo/caramujo | aproximar, largar, cozinhar, comer, vender, fogo, eletricidade |
| montaria | aproximar, montar, golpe_arma, flecha, fogo, eletricidade, estatis |
| animal / ave | aproximar, golpe_arma, flecha, fogo, eletricidade, estatis, montar |
| monstro | golpe_arma, flecha, fogo, gelo, eletricidade, agua, explosao, bomba_remota, estatis, magnetis, cenario |
| arma | usar, arremessar, fogo, eletricidade, raio, agua, magnetis, monstros |
| escudo | defender, usar, fogo, eletricidade, raio, agua, magnetis |
| arco | usar, fogo, eletricidade, raio, agua, magnetis |
| flecha | usar, fogo, gelo, eletricidade, agua, chuva, monstros, cenario |
| armadura (peça) | equipar, fogo, raio, eletricidade, calor_extremo, frio_extremo |
| conjunto | equipar |
| prato/elixir | comer, vender |
| runa/habilidade/item-chave | usar |

Fontes de propriedades de equipamento: os campos `flammable`, `magnetic`, `buoyant`, `conductive`, `guardian`,
`throw` dos parâmetros datamined (chave `dm`) são a base para fogo, Magnétis, água, eletricidade/raio e arremesso.
Regras gerais (ex.: madeira queima e flutua; metal afunda, conduz e atrai raios; o último golpe antes de quebrar é
crítico) estão em `_ref/weapon.md`, `_ref/durability.md`, `_ref/shield.md`, `_ref/bow.md`, `_ref/thunderstorm.md`.

## 5. Segredos, curiosidades e mecânicas especiais

```jsonc
{ "kind": "tecnica_avancada", "title": "Título curto", "text": "Explicação completa.", "sources": ["zw"] }
```

- **mecanica** — comportamento reproduzível do jogo.
- **curiosidade** — informação interessante (lore, bastidores, trivia) que não é necessariamente útil.
- **tecnica_avancada** — uso que exige conhecimento ou habilidade.
- **glitch** — comportamento não intencional (identifique a versão do jogo se a fonte disser).
- **nao_verificado** — relato sem confirmação; pode ficar sem fonte, mas o texto deve deixar claro que é relato.

Bons candidatos: diferenças entre variantes, limitações não óbvias, interações com monstros/ambiente, usos em
missões, comportamento em Lua de sangue, valores datamined surpreendentes, trivia do Zelda Wiki sobre BOTW.

## 6. Capacidades (navegação inversa)

Marque as que se aplicam, com base em interações confirmadas ou dados:
`gera_fogo`, `gera_gelo`, `gera_eletricidade`, `gera_explosao`, `congela_inimigos`, `queima_inimigos`,
`eletrocuta_inimigos`, `inflamavel`, `conduz_eletricidade`, `atrai_raios`, `magnetico`, `flutua`, `faz_flutuar`,
`reage_fogo`, `reage_gelo`, `reage_eletricidade`, `ilumina`, `cura`, `vigor`, `protege_calor`, `protege_frio`,
`protege_choque`, `protege_fogo`, `furtividade`, `velocidade`, `ataque`, `defesa`, `reflete_laser`,
`arremessavel`, `montavel`, `habilidade_especial`, `revela_recursos`, `vence_rapido`, `item_de_missao`.

## 7. Chaves de fonte

| Chave | Significa |
|---|---|
| `zw` | Página principal da entidade no Zelda Wiki (a do pacote de fontes) |
| `zw:Título` | Outra página do Zelda Wiki (título exato, como aparece em "Chave de fonte" na ferramenta) |
| `comp` | Entrada do Hyrule Compendium (texto oficial do jogo via Hyrule Compendium API) |
| `jogo` | Texto do jogo citado nas referências do Zelda Wiki (descrições de inventário, falas) |
| `dm` | Parâmetros datamined publicados no Zelda Wiki (templates "BotW ... Parameters/Properties") |

Toda página citada com `zw:Título` precisa existir no cache — rode a ferramenta de pesquisa para ela ao menos uma vez.

## 8. Processo por lote

1. Leia este guia e as três fichas-modelo.
2. Para cada id do lote: leia `data/sources/<id>.md`; consulte `_ref` e a ferramenta conforme necessário; escreva
   `data/content/<id>.json`.
3. Rode o validador para os arquivos do lote e corrija **todos os erros**; resolva os avisos quando possível.
4. No relatório final liste: ids concluídos, ids com `verification_status` diferente de "verificado" e por quê,
   conflitos entre fontes encontrados e qualquer suspeita de erro nos dados estruturados.
