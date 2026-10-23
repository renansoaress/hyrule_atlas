// Monta o arquivo de dados consumido pela interface: src/generated/atlas.json
// Junta: inventário (fatos estruturados), nomes PT-BR, termos, imagens, extratos do wiki e fichas redigidas.
// Toda informação numérica vem das fontes estruturadas; o texto vem das fichas em data/content.
import fs from 'node:fs';
import { readJson, writeJson, p, log, normKey, slugify } from '../lib/util.mjs';
import { ACTIONS, STATUSES, KINDS, CAPABILITIES, VERIFICATION } from '../lib/schema.mjs';
import { wikiCacheFile } from '../lib/wikicache.mjs';

const inv = readJson(p('data/inventory/inventory.json'));
const names = readJson(p('data/glossary/names.json'));
const terms = readJson(p('data/glossary/terms-resolved.json'));
const images = readJson(p('data/inventory/images.json'));
const extracts = readJson(p('data/inventory/wiki-extracts.json'));
const coelho = readJson(p('data/raw/ptbr/coelhonews-pairs.json'));

const byId = new Map(inv.map((e) => [e.id, e]));
const byName = new Map();
for (const e of inv) {
  byName.set(normKey(e.name_en), e);
  for (const a of e.aliases_en) byName.set(normKey(a), e);
}
const ptName = (id) => names[id]?.name_ptbr ?? byId.get(id)?.name_en ?? id;
const term = (t) => terms[t]?.name_ptbr ?? terms[normKey(t)]?.name_ptbr ?? t;
const findEntity = (name) => byName.get(normKey(String(name).replace(/^(a|an|the) /i, '')));

// ---------------------------------------------------------------- rótulos
export const CATEGORIES = [
  { key: 'materiais', label: 'Materiais e ingredientes', subs: { frutas: 'Frutas e nozes', cogumelos: 'Cogumelos', vegetais: 'Vegetais', ervas_e_flores: 'Ervas e flores', carnes: 'Carnes', ingredientes: 'Ingredientes básicos', peixes: 'Peixes', frutos_do_mar: 'Caranguejos e caramujos', insetos: 'Insetos', anfibios_e_repteis: 'Lagartos e sapos', partes_de_monstros: 'Partes de monstros', partes_de_dragao: 'Partes de dragões', minerais: 'Minérios e gemas', materiais_ancestrais: 'Materiais ancestrais', diversos: 'Diversos', especiais: 'Especiais' } },
  { key: 'armas', label: 'Armas', subs: { uma_mao: 'Uma mão', duas_maos: 'Duas mãos', lancas: 'Lanças' } },
  { key: 'arcos', label: 'Arcos', subs: { arcos: 'Arcos' } },
  { key: 'flechas', label: 'Flechas', subs: { flechas: 'Flechas' } },
  { key: 'escudos', label: 'Escudos', subs: { escudos: 'Escudos' } },
  { key: 'armaduras', label: 'Armaduras e roupas', subs: { cabeca: 'Cabeça', torso: 'Torso', pernas: 'Pernas', conjuntos: 'Conjuntos' } },
  { key: 'culinaria', label: 'Pratos e elixires', subs: { pratos: 'Pratos', assados_e_tostados: 'Assados e tostados', congelados: 'Congelados', elixires: 'Elixires' } },
  { key: 'criaturas', label: 'Criaturas e montarias', subs: { montarias: 'Montarias', animais: 'Animais', aves: 'Aves', peixes: 'Peixes', frutos_do_mar: 'Caranguejos e caramujos', insetos: 'Insetos', anfibios_e_repteis: 'Lagartos e sapos', especiais: 'Especiais' } },
  { key: 'monstros', label: 'Monstros e chefes', subs: { inimigos_comuns: 'Inimigos comuns', minichefes: 'Minichefes', guardioes: 'Guardiões', cla_yiga: 'Clã Yiga', dragoes: 'Dragões', chefes: 'Chefes' } },
  { key: 'itens_chave', label: 'Itens-chave', subs: { itens_chave: 'Itens-chave', equipamento_de_montaria: 'Selas e rédeas' } },
  { key: 'runas', label: 'Runas e habilidades', subs: { runas: 'Runas', habilidades_dos_campeoes: 'Habilidades dos Campeões' } },
  { key: 'mecanicas', label: 'Mecânicas', subs: { combate: 'Combate', exploracao: 'Exploração', elementos_e_clima: 'Elementos e clima', culinaria: 'Culinária', progressao: 'Progressão' } },
  { key: 'objetos', label: 'Objetos do cenário', subs: { objetos: 'Objetos' } },
  { key: 'tesouros', label: 'Tesouros e depósitos', subs: { baus: 'Baús', depositos: 'Depósitos de minério' } },
];
const SUB_LABEL = Object.fromEntries(CATEGORIES.flatMap((c) => Object.entries(c.subs).map(([k, v]) => [c.key + '/' + k, v])));
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

const DLC_LABEL = { TMT: 'DLC 1 — As Provações Lendárias (The Master Trials)', TCB: 'DLC 2 — A Balada dos Campeões (The Champions\' Ballad)', DLC: 'Conteúdo adicional (DLC)' };
const WEAPON_CAT = { 'One-Handed Weapon': 'Arma de uma mão', 'Two-Handed Weapon': 'Arma de duas mãos', Spear: 'Lança' };
const COMPOSITION = { Wood: 'Madeira', Metal: 'Metal', Ancient: 'Tecnologia ancestral' };
const PART = { Head: 'Cabeça', Chest: 'Torso', Legs: 'Pernas' };

// expressões genéricas das receitas -> PT-BR e conjunto de ids aceitos
const subIds = (...subs) => inv.filter((e) => subs.includes(e.subcategory) && e.categories.includes('materiais')).map((e) => e.id);
const namesIds = (...ns) => ns.map((n) => findEntity(n)?.id).filter(Boolean);
const MEAT = namesIds('Raw Meat', 'Raw Bird Drumstick');
const PRIME = namesIds('Raw Prime Meat', 'Raw Bird Thigh');
const GOURMET = namesIds('Raw Gourmet Meat', 'Raw Whole Bird');
const FRUITS = subIds('frutas').filter((id) => !namesIds('Acorn', 'Chickaloo Tree Nut').includes(id));
const VEG = subIds('vegetais', 'ervas_e_flores');
const SEAFOOD = subIds('peixes', 'frutos_do_mar');
const PHRASES = [
  [/^Any Mushrooms? ?\(4 different kinds\)$/, 'Quaisquer cogumelos (4 tipos diferentes)', () => subIds('cogumelos')],
  [/^Any Mushroom$/, 'Qualquer cogumelo', () => subIds('cogumelos')],
  [/^Any Meats ?\(4 different kinds\)$/, 'Quaisquer carnes (4 tipos diferentes)', () => [...MEAT, ...PRIME, ...GOURMET]],
  [/^Any 3 or less Meat$/, 'Até 3 carnes quaisquer', () => [...MEAT, ...PRIME, ...GOURMET]],
  [/^Any Meat$/, 'Qualquer carne', () => [...MEAT, ...PRIME, ...GOURMET]],
  [/^Any Prime Meat$/, 'Qualquer carne de segunda (Carne de segunda ou Sobrecoxa)', () => PRIME],
  [/^Any Gourmet Meat$/, 'Qualquer carne de primeira (Carne de primeira ou Ave inteira)', () => GOURMET],
  [/^Raw Meat or Raw Bird Drumstick$/, 'Carne de terceira ou Coxa', () => MEAT],
  [/^Any Seafood ?\(4 different kinds\)$/, 'Quaisquer frutos do mar (4 tipos diferentes)', () => SEAFOOD],
  [/^Any Seafood \(except Porgy or Salmon\)$/, 'Qualquer fruto do mar (exceto pargos e salmão)', () => SEAFOOD.filter((id) => !/porgy|salmon/.test(id))],
  [/^Any Seafood$/, 'Qualquer fruto do mar (peixes, caranguejos ou caramujos)', () => SEAFOOD],
  [/^Any Fish or Snail$/, 'Qualquer peixe ou caramujo', () => [...subIds('peixes'), ...namesIds('Sneaky River Snail', 'Hearty Blueshell Snail')]],
  [/^Any Fish$/, 'Qualquer peixe', () => subIds('peixes')],
  [/^Any Crab or Snail$/, 'Qualquer caranguejo ou caramujo', () => subIds('frutos_do_mar')],
  [/^Any Crab$/, 'Qualquer caranguejo', () => namesIds('Razorclaw Crab', 'Ironshell Crab', 'Bright-Eyed Crab')],
  [/^Any Porgy$/, 'Qualquer pargo', () => namesIds('Mighty Porgy', 'Armored Porgy')],
  [/^Hearty Blueshell Snail or Any Porgy$/, 'Caramujo nutritivo ou qualquer pargo', () => namesIds('Hearty Blueshell Snail', 'Mighty Porgy', 'Armored Porgy')],
  [/^Any Carp$/, 'Qualquer carpa', () => namesIds('Mighty Carp', 'Armored Carp', 'Sanke Carp')],
  [/^Any Trout$/, 'Qualquer truta', () => namesIds('Chillfin Trout', 'Sizzlefin Trout', 'Voltfin Trout', 'Stealthfin Trout')],
  [/^Any Bass$/, 'Qualquer robalo', () => namesIds('Hyrule Bass', 'Hearty Bass', 'Staminoka Bass')],
  [/^Any Fruit ?\(4 different kinds\)$/, 'Quaisquer frutas (4 tipos diferentes)', () => FRUITS],
  [/^Any Fruit \(besides Apple\)$/, 'Qualquer fruta (exceto Maçã)', () => FRUITS.filter((id) => !/_apple$/.test(id))],
  [/^Any Fruit$/, 'Qualquer fruta', () => FRUITS],
  [/^Apple or Wildberry$/, 'Maçã ou Framboesa', () => namesIds('Apple', 'Wildberry')],
  [/^Acorn or Chickaloo Tree Nut$/, 'Bolota ou Noz', () => namesIds('Acorn', 'Chickaloo Tree Nut')],
  [/^Any Carrot or Pumpkin$/, 'Qualquer cenoura ou abóbora', () => namesIds('Swift Carrot', 'Endura Carrot', 'Fortified Pumpkin')],
  [/^Any Carrot$/, 'Qualquer cenoura', () => namesIds('Swift Carrot', 'Endura Carrot')],
  [/^Any Radish$/, 'Qualquer rabanete', () => namesIds('Hearty Radish', 'Big Hearty Radish')],
  [/^Any Vegetables?, Herbs?, or Flowers? ?\(4 different kinds\)$/, 'Quaisquer vegetais, ervas ou flores (4 tipos diferentes)', () => VEG],
  [/^Any Vegetable, Herb, or Flower \(except Carrots or Pumpkins\)$/, 'Qualquer vegetal, erva ou flor (exceto cenouras e abóboras)', () => VEG.filter((id) => !/carrot|pumpkin/.test(id))],
  [/^Any Vegetable, Herb, or Flower \(except Pumpkins\)$/, 'Qualquer vegetal, erva ou flor (exceto abóboras)', () => VEG.filter((id) => !/pumpkin/.test(id))],
  [/^Any Vegetable, Herb, or Flower$/, 'Qualquer vegetal, erva ou flor', () => VEG],
  [/^Any Vegetable,$/, 'Qualquer vegetal,', () => VEG],
  [/^Herb, or Flower$/, 'erva ou flor', () => []],
  [/^Monster Part$/, 'Parte de monstro', () => subIds('partes_de_monstros', 'partes_de_dragao', 'materiais_ancestrais')],
  [/^Chilly Critter$/, 'Bicho refrescante (resistência ao calor)', () => []],
  [/^Electro Critter$/, 'Bicho isolante (resistência a choques)', () => []],
  [/^Energizing Critter$/, 'Bicho energizante (recupera vigor)', () => []],
  [/^Fireproof Critter$/, 'Bicho corta-fogo (proteção contra chamas)', () => []],
  [/^Hasty Critter$/, 'Bicho veloz (velocidade)', () => []],
  [/^Spicy Critter$/, 'Bicho picante (resistência ao frio)', () => []],
  [/^Food with Critters or Monster Parts$/, 'Alimentos misturados com bichos ou partes de monstro', () => []],
  [/^or Seasoning w\/o Food$/, 'ou apenas temperos, sem alimento', () => []],
  [/^or Monster Parts w\/o Critters$/, 'ou partes de monstro sem bichos', () => []],
  [/^or Critters w\/o Monster Parts$/, 'ou bichos sem partes de monstro', () => []],
  [/^Wood or ore$/, 'Madeira ou minério', () => []],
];
function ingredient(token) {
  const ent = findEntity(token);
  if (ent) return { text: ptName(ent.id), id: ent.id, accepts: [ent.id] };
  for (const [re, pt, fn] of PHRASES) if (re.test(token)) return { text: pt, id: null, accepts: fn() };
  return { text: token, id: null, accepts: [], untranslated: true };
}

// ---------------------------------------------------------------- fontes
const pageCache = new Map();
function wikiPage(title) {
  if (pageCache.has(title)) return pageCache.get(title);
  const f = wikiCacheFile(title);
  const v = f ? readJson(f) : null;
  const out = v ? { title: v.title, url: v.url, revid: v.revid } : null;
  pageCache.set(title, out);
  return out;
}
function sourceDefs(e, keys, content) {
  const ex = extracts[e.id];
  const main = ex?.pages?.[0];
  const defs = [];
  const c = e.facts.compendium;
  for (const k of keys) {
    if (k === 'zw' && main) defs.push({ key: k, title: `Zelda Wiki — ${main.title}`, url: main.url, type: 'wiki', license: 'GNU FDL 1.3' });
    else if (k === 'jogo' && main) defs.push({ key: k, title: `Texto do jogo citado no Zelda Wiki (${main.title})`, url: main.url, type: 'jogo', license: 'Texto © Nintendo' });
    else if (k === 'dm' && main) defs.push({ key: k, title: `Parâmetros extraídos do jogo, publicados no Zelda Wiki (${main.title})`, url: main.url, type: 'datamine', license: 'GNU FDL 1.3' });
    else if (k === 'comp' && c)
      defs.push({
        key: k,
        title: `Hyrule Compendium nº ${c.number}${c.master_mode ? ' (Modo Mestre)' : ''} — ${c.name}`,
        url: `https://api.hyrule-compendium.com/v3/compendium/${c.master_mode ? 'master_mode/' : ''}entry/${c.number}`,
        type: 'compendium',
        license: 'Texto © Nintendo (via Hyrule Compendium API, MIT)',
      });
    else if (k.startsWith('zw:')) {
      const pg = wikiPage(k.slice(3));
      if (pg) defs.push({ key: k, title: `Zelda Wiki — ${pg.title}`, url: pg.url, type: 'wiki', license: 'GNU FDL 1.3' });
    } else if (k.startsWith('teste:') && content?.extra_sources?.[k]) defs.push({ key: k, ...content.extra_sources[k], type: 'teste' });
  }
  return defs;
}

// ---------------------------------------------------------------- estatísticas
const fmtNum = (n) => (n == null ? null : String(n).replace('.', ','));
function stats(e) {
  const f = e.facts;
  const s = [];
  const add = (label, value, src = 'zw', note) => value != null && value !== '' && s.push({ label, value: String(value), src, note });
  // Para equipamentos, a numeração do jogo vem das tabelas do Zelda Wiki ("204/209 (Master Mode)");
  // a da API difere. Nas demais categorias usa-se a da API, com ressalva (o número muda com DLC/Modo Mestre).
  const eqNo = (f.weapon ?? f.shield ?? f.bow)?.compendium_no;
  const eqMatch = eqNo?.match(/^(\d+)(?:\/(\d+))?/);
  if (eqMatch) add('Nº no Hyrule Compendium', eqMatch[2] ? `${eqMatch[1]} (Modo Mestre: ${eqMatch[2]})` : eqMatch[1], 'zw');
  else if (f.compendium)
    add('Nº no Hyrule Compendium', `${f.compendium.number}${f.compendium.master_mode ? ' (Modo Mestre)' : ''}`, 'comp', 'Numeração da Hyrule Compendium API; no jogo o número pode variar com o DLC e o Modo Mestre.');
  if (f.weapon) {
    add('Tipo', WEAPON_CAT[f.weapon.category] ?? f.weapon.category);
    // valores não numéricos (ex.: "∞" do Obliterador) são exibidos como texto, nunca reduzidos a um número
    if (/^\d/.test(f.weapon.attack_text ?? '')) add('Ataque', f.weapon.attack, 'zw', f.weapon.attack_text !== String(f.weapon.attack) ? f.weapon.attack_text : undefined);
    else add('Ataque', f.weapon.attack_text?.replace(/\s+\d[\s\S]*$/, '') || null, 'zw', f.weapon.attack_text);
    add('Durabilidade', f.weapon.durability, 'zw', f.weapon.durability_text !== String(f.weapon.durability) ? f.weapon.durability_text : undefined);
    add('Pode usar com escudo', f.weapon.with_shield === 'Yes' ? 'Sim' : f.weapon.with_shield === 'No' ? 'Não' : null);
  }
  if (f.bow) {
    add('Ataque', f.bow.strength, 'zw', f.bow.strength_text !== String(f.bow.strength) ? f.bow.strength_text : undefined);
    add('Durabilidade', f.bow.durability, 'zw', f.bow.durability_text !== String(f.bow.durability) ? f.bow.durability_text : undefined);
    add('Alcance', f.bow.range != null ? `${f.bow.range} m` : null);
  }
  if (f.shield) {
    add('Defesa (guarda)', f.shield.guard, 'zw', f.shield.guard_text !== String(f.shield.guard) ? f.shield.guard_text : undefined);
    add('Durabilidade', f.shield.durability, 'zw', f.shield.durability_text !== String(f.shield.durability) ? f.shield.durability_text : undefined);
    add('Material', COMPOSITION[f.shield.composition] ?? f.shield.composition);
  }
  const pr = f.properties;
  if (pr && ['weapon', 'bow', 'shield'].includes(e.type)) {
    const yn = (v) => (v == null ? null : v ? 'Sim' : 'Não');
    add('Inflamável', yn(pr.flammable), 'dm');
    add('Magnética (Magnétis)', yn(pr.magnetic), 'dm');
    add('Flutua na água', yn(pr.buoyant), 'dm');
    add('Conduz eletricidade', yn(pr.conductive), 'dm');
    add('Tecnologia ancestral', yn(pr.guardian), 'dm');
    if (e.type === 'bow' && pr.multishot) add('Flechas por disparo', pr.multishot, 'dm');
  }
  const ex = extracts[e.id]?.params ?? {};
  // SellingPrice/BuyingPrice dos parâmetros de armas não são usados pelo jogo (documentação do template no
  // Zelda Wiki), por isso não são exibidos como preço.
  if (f.material) add('Preço de venda', f.material.value != null ? `${f.material.value} rupias` : f.material.value_text);
  if (f.monster_part_table) {
    add('Valor em Mon (Kilton)', f.monster_part_table.Mon);
    add('Duração extra em elixires', f.monster_part_table['Elixir Duration Increase']);
  }
  if (f.compendium?.hearts_recovered != null) add('Corações recuperados (cru)', fmtNum(f.compendium.hearts_recovered), 'comp');
  if (f.compendium?.cooking_effect) add('Efeito culinário', term(f.compendium.cooking_effect), 'comp');
  if (f.food) {
    if (f.food.hearts != null) add('Corações recuperados', fmtNum(f.food.hearts));
    if (f.food.sell_price != null) add('Preço de venda', `${f.food.sell_price} rupias`);
    if (f.food.effect && f.food.hearts == null) add('Efeito', term(f.food.effect));
  }
  if (f.armor) {
    add('Parte do corpo', PART[f.armor.body_part] ?? f.armor.body_part);
    const lv = f.armor.levels;
    if (lv.length) add('Defesa', lv.length > 1 ? `${lv[0].defense} → ${lv[lv.length - 1].defense} (★${lv.length - 1})` : `${lv[0].defense} (não pode ser melhorada)`);
    if (f.armor.effects.length) add('Efeito', f.armor.effects.map(term).join(', '));
    if (f.armor.set) {
      const set = findEntity(f.armor.set);
      add('Conjunto', set ? ptName(set.id) : f.armor.set);
    }
  }
  if (f.key_item?.obtained_from) add('Obtido em', f.key_item.obtained_from);
  if (e.dlc) add('Conteúdo adicional', DLC_LABEL[e.dlc] ?? e.dlc, 'zw');
  if (e.amiibo) add('amiibo', e.amiibo, 'zw');
  return s;
}

function modifiers(e) {
  const prm = extracts[e.id]?.params ?? {};
  const w = prm.weapon_parameters ?? prm.elemental_weapon_parameters;
  const b = prm.bow_parameters;
  const sh = prm.shield_parameters;
  const rows = [];
  const range = (a, b2, suffix = '') => (a == null ? null : a === b2 || b2 == null ? `+${fmtNum(a)}${suffix}` : `+${fmtNum(a)} a +${fmtNum(b2)}${suffix}`);
  const mult = (a, b2) => (a == null ? null : a === b2 || b2 == null ? `${fmtNum(a)}×` : `${fmtNum(a)}× a ${fmtNum(b2)}×`);
  if (w || b) {
    const x = w ?? b;
    rows.push({ bonus: 'Ataque aumentado', comum: range(x.SharpWeaponAddAtkMin, x.SharpWeaponAddAtkMax), aprimorado: range(x.PoweredSharpAddAtkMin, x.PoweredSharpAddAtkMax) });
    rows.push({ bonus: 'Durabilidade aumentada', comum: range(x.SharpWeaponAddLifeMin, x.SharpWeaponAddLifeMax), aprimorado: range(x.PoweredSharpAddLifeMin, x.PoweredSharpAddLifeMax) });
  }
  if (w) {
    if (w.SharpWeaponAddCrit != null) rows.push({ bonus: 'Acerto crítico', comum: w.SharpWeaponAddCrit ? 'Possível' : 'Não ocorre', aprimorado: null });
    rows.push({ bonus: 'Lançamento longo', comum: null, aprimorado: mult(w.PoweredSharpAddThrowMin, w.PoweredSharpAddThrowMax) });
  }
  if (b) {
    if (b.PoweredSharpAddSpreadFire) rows.push({ bonus: 'Disparo quíntuplo (5×)', comum: null, aprimorado: 'Possível' });
    if (b.PoweredSharpAddZoomRapid) rows.push({ bonus: 'Disparo rápido', comum: null, aprimorado: mult(b.PoweredSharpAddRapidFireMin, b.PoweredSharpAddRapidFireMax) });
  }
  if (sh) {
    rows.push({ bonus: 'Defesa aumentada', comum: range(sh.SharpWeaponAddGuardMin, sh.SharpWeaponAddGuardMax), aprimorado: range(sh.PoweredSharpAddGuardMin, sh.PoweredSharpAddGuardMax) });
    rows.push({ bonus: 'Durabilidade aumentada', comum: range(sh.SharpWeaponAddLifeMin, sh.SharpWeaponAddLifeMax), aprimorado: range(sh.PoweredSharpAddLifeMin, sh.PoweredSharpAddLifeMax) });
  }
  const out = rows.filter((r) => r.comum || r.aprimorado);
  const extra = [];
  if (w?.ChemicalEnergyMax > 0) extra.push({ label: 'Energia elemental', value: `${w.ChemicalEnergyMax / (w.ChemicalEnergyAmountUsed || 1)} cargas (recarga gradual)` });
  if (b?.IsLeadShot && b.LeadShotNum) extra.push({ label: 'Disparo múltiplo nativo', value: `${b.LeadShotNum} flechas por disparo` });
  if (b?.IsRapidFire && b.RapidFireNum) extra.push({ label: 'Disparo em sequência nativo', value: `${b.RapidFireNum} flechas` });
  if (sh?.MirrorLevel) extra.push({ label: 'Reflexão (MirrorLevel)', value: String(sh.MirrorLevel) });
  return { rows: out, extra };
}

// ---------------------------------------------------------------- relações estruturadas
const recipesUsing = new Map(); // id material -> [food ids]
const recipeOf = new Map(); // food id -> [{text,id}]
for (const e of inv.filter((x) => x.facts.food)) {
  const list = e.facts.food.ingredients_list.map(ingredient);
  recipeOf.set(e.id, list.map((x) => ({ text: x.text, id: x.id })));
  for (const ing of list) for (const a of ing.accepts) {
    if (!recipesUsing.has(a)) recipesUsing.set(a, new Set());
    recipesUsing.get(a).add(e.id);
  }
}
const upgradesUsing = new Map(); // material id -> [{armor, level, qty}]
const armorLevels = new Map();
for (const e of inv.filter((x) => x.facts.armor)) {
  armorLevels.set(
    e.id,
    e.facts.armor.levels.map((l) => ({
      level: l.level,
      defense: l.defense,
      sell_price: l.sell_price,
      materials: l.materials.map((m) => {
        const ent = findEntity(m.item);
        if (ent) {
          if (!upgradesUsing.has(ent.id)) upgradesUsing.set(ent.id, []);
          upgradesUsing.get(ent.id).push({ id: e.id, level: l.level, qty: m.qty });
        }
        return { qty: m.qty, id: ent?.id ?? null, text: ent ? ptName(ent.id) : m.item };
      }),
    })),
  );
}
const droppedBy = new Map();
function drops(e) {
  const out = [];
  for (const d of e.facts.compendium?.drops ?? []) {
    const ent = findEntity(d);
    if (ent) {
      out.push({ id: ent.id, text: ptName(ent.id) });
      if (!droppedBy.has(ent.id)) droppedBy.set(ent.id, new Set());
      droppedBy.get(ent.id).add(e.id);
    } else out.push({ id: null, text: term(d) });
  }
  return out;
}
const dropsOf = new Map(inv.map((e) => [e.id, drops(e)]));
const setMembers = new Map();
for (const e of inv.filter((x) => x.type === 'armor_set'))
  setMembers.set(e.id, (e.facts.armor_set?.members ?? []).map((n) => findEntity(n)?.id).filter(Boolean));
const familyMembers = new Map();
for (const e of inv.filter((x) => x.family)) {
  if (!familyMembers.has(e.family)) familyMembers.set(e.family, []);
  familyMembers.get(e.family).push(e.id);
}

// lojas: o Zelda Wiki registra rupias e materiais de um mesmo preço em linhas separadas — aqui são unidas
function shopsOf(e) {
  const by = new Map();
  for (const w of e.facts.wares ?? []) {
    if (!by.has(w.shop)) by.set(w.shop, { shop: term(w.shop), parts: [], stock: w.stock ?? null });
    const s = by.get(w.shop);
    if (w.price_rupees != null) s.parts.push(`${w.price_rupees} rupias`);
    else if (w.price && w.price !== 'N/A')
      for (const item of w.price.split(',')) {
        const m = item.trim().match(/^(\d+)\s+(.+)$/);
        const ent = m ? findEntity(m[2]) : null;
        s.parts.push(m ? `${m[1]}× ${ent ? ptName(ent.id) : m[2]}` : item.trim());
      }
  }
  return [...by.values()].map((s) => ({ shop: s.shop, price: [...new Set(s.parts)].join(' + ') || null, stock: s.stock }));
}

// ---------------------------------------------------------------- montagem
const contentDir = p('data/content');
const out = [];
const missingContent = [];
for (const e of inv) {
  const cf = `${contentDir}/${e.id}.json`;
  const content = fs.existsSync(cf) ? readJson(cf) : null;
  if (!content) missingContent.push(e.id);
  const n = names[e.id];
  const img = images[e.id] ?? {};

  // chaves de fonte efetivamente usadas
  const keys = new Set(['zw']);
  if (e.facts.compendium) keys.add('comp');
  if (extracts[e.id]?.params && Object.keys(extracts[e.id].params).length) keys.add('dm');
  for (const it of content?.interactions ?? []) for (const k of it.sources ?? []) keys.add(k);
  for (const s of content?.secrets ?? []) for (const k of s.sources ?? []) keys.add(k);

  const related = [];
  const seenRel = new Set([e.id]);
  const rel = (id, relation, origin = 'ficha') => {
    if (!id || seenRel.has(id) || !byId.has(id)) return;
    seenRel.add(id);
    related.push({ id, relation, origin });
  };
  for (const r of content?.related ?? []) rel(r.id, r.relation);
  for (const m of setMembers.get(e.id) ?? []) rel(m, 'Peça do conjunto', 'dados');
  if (e.facts.armor?.set) rel(findEntity(e.facts.armor.set)?.id, 'Conjunto a que pertence', 'dados');
  for (const m of familyMembers.get(e.family) ?? []) rel(m, 'Mesma família (versões aprimoradas)', 'dados');
  for (const d of dropsOf.get(e.id) ?? []) rel(d.id, 'Item deixado ao ser derrotado/coletado', 'dados');
  for (const by of droppedBy.get(e.id) ?? []) rel(by, 'Fonte deste item', 'dados');
  for (const it of content?.interactions ?? []) for (const pid of it.produces ?? []) rel(pid, 'Resultado de interação', 'ficha');

  const rec = recipeOf.get(e.id);
  const inRecipes = [...(recipesUsing.get(e.id) ?? [])].map((id) => ({ id, text: ptName(id) })).sort((a, b) => a.text.localeCompare(b.text, 'pt'));
  const ups = (upgradesUsing.get(e.id) ?? []).map((u) => ({ ...u, text: ptName(u.id) }));

  const interactions = (content?.interactions ?? []).map((it) => ({ ...it, action_label: ACTIONS[it.action] }));
  const capabilities = [...new Set(content?.capabilities ?? [])];
  const elementalActions = new Set(['fogo', 'gelo', 'eletricidade', 'raio', 'fogueira', 'calor_extremo', 'frio_extremo']);
  const flags = {
    elemental:
      interactions.some((it) => elementalActions.has(it.action) && it.status === 'confirmado') ||
      capabilities.some((c) => /^(gera_|reage_|congela|queima|eletrocuta|protege_)/.test(c)),
    especial: capabilities.includes('habilidade_especial') || (content?.secrets ?? []).some((s) => s.kind === 'tecnica_avancada' || s.kind === 'mecanica'),
    curiosidades: (content?.secrets ?? []).length > 0,
  };

  out.push({
    id: e.id,
    name_ptbr: n?.name_ptbr ?? e.name_en,
    name_en: e.name_en,
    name_status: n?.status ?? 'nao_oficial',
    name_source: n?.source ?? null,
    name_note: n?.note ?? null,
    aliases_en: e.aliases_en,
    category: e.category,
    category_label: CAT_LABEL[e.category],
    categories: e.categories,
    subcategory: e.subcategory,
    subcategory_label: SUB_LABEL[e.category + '/' + e.subcategory] ?? e.subcategory,
    type: e.type,
    dlc: e.dlc,
    dlc_label: e.dlc ? DLC_LABEL[e.dlc] ?? e.dlc : null,
    amiibo: e.amiibo,
    master_mode: !!e.facts.compendium?.master_mode,
    image: { main: img.main ?? null, thumb: img.thumb ?? null, icon: img.icon ?? null, main_role: img.main_role ?? null, gallery: img.gallery ?? [], dyes: img.dyes ?? [] },
    image_credits: (img.credits ?? []).map((c) => ({ used_as: c.used_as, role: c.role_pt, color: c.color_pt ?? null, credit: c.credit, license: c.license, source_url: c.source_url, page_url: c.page_url })),
    summary: content?.summary ?? null,
    description: content?.description ?? null,
    locations: content?.locations ?? (e.facts.compendium?.common_locations ?? []).map(term),
    common_locations: (e.facts.compendium?.common_locations ?? []).map(term),
    obtaining: content?.obtaining ?? [],
    uses: content?.uses ?? [],
    effects: content?.effects ?? [],
    interactions,
    secrets: (content?.secrets ?? []).map((s) => ({ ...s, kind_label: KINDS[s.kind] })),
    no_secrets_note: content?.no_secrets_note ?? null,
    advanced_uses: content?.advanced_uses ?? [],
    limitations: content?.limitations ?? [],
    related,
    capabilities,
    verification_status: content?.verification_status ?? 'a_verificar',
    content_status: content ? 'redigida' : 'pendente',
    stats: stats(e),
    modifiers: ['weapon', 'bow', 'shield'].includes(e.type) ? modifiers(e) : null,
    armor_levels: armorLevels.get(e.id) ?? null,
    armor_effects: e.facts.armor?.effects?.map(term) ?? null,
    set_members: setMembers.get(e.id) ?? null,
    recipe: rec ?? null,
    in_recipes: inRecipes,
    upgrades_using: ups,
    drops: dropsOf.get(e.id) ?? [],
    dropped_by: [...(droppedBy.get(e.id) ?? [])].map((id) => ({ id, text: ptName(id) })),
    shops: shopsOf(e),
    variants: (n?.variants ?? []).map((v, i) => ({ name_ptbr: v.name_ptbr ?? v.name_en, name_en: v.name_en, name_status: v.status ?? 'nao_oficial', description: e.variants[i]?.description ?? null })),
    compendium_text_en: e.facts.compendium?.description ?? null,
    game_text_en: e.facts.material?.description ?? e.facts.food?.description ?? e.facts.weapon?.description ?? e.facts.shield?.description ?? e.facts.bow?.description ?? e.facts.key_item?.description ?? null,
    flags,
    sources: sourceDefs(e, [...keys], content),
  });
}

// valida destinos de relações (remove ids inexistentes por segurança)
const ids = new Set(out.map((x) => x.id));
for (const x of out) x.related = x.related.filter((r) => ids.has(r.id));

const counts = {};
for (const x of out) counts[x.category] = (counts[x.category] ?? 0) + 1;
const atlas = {
  meta: {
    title: 'Hyrule Atlas',
    game: 'The Legend of Zelda: Breath of the Wild',
    generated_at: new Date().toISOString(),
    total: out.length,
    counts,
    content_written: out.length - missingContent.length,
    name_status: Object.fromEntries(['oficial', 'oficial_secundaria', 'nao_oficial'].map((s) => [s, out.filter((x) => x.name_status === s).length])),
    ptbr_names_source: { title: coelho.title, url: coelho.source, author: coelho.author, published: coelho.published },
  },
  categories: CATEGORIES.map((c) => ({ key: c.key, label: c.label, subs: Object.entries(c.subs).map(([k, v]) => ({ key: k, label: v })) })),
  vocab: { actions: ACTIONS, statuses: STATUSES, kinds: KINDS, capabilities: CAPABILITIES, verification: VERIFICATION },
  entities: out,
};
writeJson(p('src/generated/atlas.json'), atlas, { pretty: false });
const size = fs.statSync(p('src/generated/atlas.json')).size;
log(`atlas.json: ${out.length} entidades, ${(size / 1048576).toFixed(2)} MB; fichas redigidas: ${atlas.meta.content_written}; pendentes: ${missingContent.length}`);
