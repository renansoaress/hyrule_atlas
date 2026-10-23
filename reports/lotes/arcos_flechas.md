# Lote "arcos_flechas" — 33 fichas (0 erros, 0 avisos)

Fichas `parcial`: Arco da Luz (material não descrito pelas fontes), Arco do crepúsculo (só `magnetic: false` nos dados), Flecha incendiária (água/eletricidade sem fonte), Flecha explosiva (água sem fonte), Flecha congelante (água/chuva/cenário sem fonte), Flecha de luz (extrato curto; também disparada pelo Arco do crepúsculo).

Confirmado nas fontes: Flecha ancestral desintegra inimigos e impede drops; disparo quíntuplo só no Arco da floresta e nos três arcos de Centaleão; Arco da harpia, Arco ancestral e Arco da Luz nunca recebem bônus; Arco de madeira só recebe bônus comuns.

Conflitos nos dados estruturados:
1. Arco ancestral: `BotWItemProperties.strength` 22 vs. 44 (compendium, infobox, datamine); alcance 50 (tabela) vs. 40 (datamine).
2. Arco centaleônico forte: properties strength 44 / guardian true vs. datamine Power 20 / guardian false (20×3 flechas).
3. Arco do crepúsculo: properties strength 100 vs. 30 (texto e datamine); alcance "8,000" lido como 8 (corrigido no importador).
4. Arco dourado e Arco de precisão: `zoom` nulo, embora tenham zoom.
5. Arco do falcão: página do arco diz que Teba entrega Arco da andorinha modificado; página de Teba diz Arco do falcão.
6. Gravidade alterada: página do Arco ancestral diz que só ele e o Arco prateado; datamine mostra -5 também no Arco da Luz e no Arco do crepúsculo.
7. Posição do olho de Ganon, Besta Sombria: testa (página do Arco da Luz) vs. nuca (página do chefe).
8. Flecha congelante: tabela de lojas inclui Coral Reef; texto do wiki não.
9. Arco Kobo pontudo: citação de inventário no wiki intitulada "Spiked Boko Bat".
10. LeadShotNum/RapidFireNum preenchidos com IsLeadShot/IsRapidFire desligados em vários arcos (curiosidade, não erro).
