# Lote "armas_uma_mao" — 48 fichas (0 erros, 0 avisos)

`a_verificar` (6): Clava Kobo (durabilidade 8 × Life 12), Varinha de fogo (ataque 10 no compendium × 5; recompensa de Nebb rupia roxa × vermelha), Bimerangue Lagal (25 × Life 23), Trimerangue Lagal (36 × 35), Espada larga do soldado (25 × Life 23), Marreta Bóim (`flammable: false` × texto diz que pega fogo).
`parcial`: Obliterador (sem parâmetros datamined).

Suspeitas:
- Obliterador: ataque "∞" era convertido em 1 — corrigido no build (exibido como texto).
- Concha de madeira: PoweredSharpAddLifeMax = 45 com durabilidade base 5 (provável erro de transcrição).
- Espada Mestra e Tocha sem `item_properties`.
- Varinhas: `throw: true` × `IsThrowingWeapon: false` é coerente (o arremesso dispara a magia).
- Página "Weapon" × "Electric Wizzrobe" sobre quais armas escapam da mão no choque; usada a regra geral.
