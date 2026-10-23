# Lote "escudos" — 33 fichas (0 erros, 0 avisos)

Ficha marcada `a_verificar`: **Escudo Kobo pontudo** — tabela de escudos e `shield_parameters` dão Defesa 10 / durabilidade 7; `BotWItemProperties` dá força 1 / durabilidade 10 (idêntico à Tampa de panela); o compendium registra ataque 10 / defesa 0; o ActorName informado (`Weapon_Shield_006`) é o mesmo do Escudo Kobo dracônico. Divergência explicada na ficha.

Conflitos e suspeitas nos dados estruturados:
- Escudo da visão anímica: a tabela "Shields in BotW" diz madeira; parâmetros datamined e texto do wiki tratam como metal. Seguidos os parâmetros.
- Escudo do viajante: `BotWItemProperties` sem flammable/magnetic/buoyant/conductive/guardian; usado o texto do wiki.
- Escudo hyliano: parâmetros usam `defense: 90` em vez de `strength`.
- `throw: true` no Escudo ancestral e Escudos guardiões 2.0/3.0 — escudos não são arremessáveis em BOTW; dado ignorado.
- Escudos guardiões 2.0/3.0: wiki diz que desviam lasers de outros Guardiões; MirrorLevel 1 e texto do jogo indicam só Guardiões batedores — registrado como `nao_verificado`.
- Escudo ancestral: wiki fala em "80% menos atrito", mas SurfingFriction = 0,15 (85%); 0,2 é o RideBreakRatio.
- Escudo-pipa: faixas de tempo do prêmio de Selmie divergem entre a página do escudo (2:05–2:20) e a tabela do minijogo (2:15–2:30, marcada game=TotK).
- Escudo de madeira: infobox diz "500 rupees (from Frelly)"; texto e páginas relacionadas dizem 50 no total. Usado 50.
- Template "BotW Shield Parameters": fórmula "GuardPower - AttackPower" parece invertida.
- `shop: "Grantéson"` nos dados de lojas é o título da página do personagem (nome de TOTK); em BOTW o vendedor é Granté.
- Numeração do compendium: para escudos, o número da API = número do Modo Mestre − 1 (inconsistência de numeração, não erro).
