// Constrói o INVENTÁRIO DE REFERÊNCIA de BOTW a partir das fontes importadas:
//   - Hyrule Compendium (data/raw/compendium.json)
//   - Zelda Wiki: listas de armas/escudos/arcos, tabelas de materiais e comidas, armaduras (Cargo),
//     itens-chave, propriedades de itens, lojas
//   - Listas curadas (runas, mecânicas, objetos, montarias especiais) em data/inventory/curated.json
// Resolve duplicatas e variantes, atribui ids estáveis e registra conflitos entre fontes.
// Saídas: data/inventory/inventory.json, wiki-titles.json, conflicts.json
import { readJson, writeJson, p, log, slugify, normKey, titleCaseEn } from '../lib/util.mjs';
import { parseDataTables } from '../lib/wikitable.mjs';
import { wikiToText } from '../lib/wikiclean.mjs';

const raw = (f) => readJson(p('data/raw', f));
const page = (slug) => readJson(p('data/raw/zeldawiki/pages', slug + '.json')).wikitext;
const curated = readJson(p('data/inventory/curated.json'));

const conflicts = [];
const conflict = (kind, detail) => conflicts.push({ kind, ...detail });

/** @type {Map<string, any>} chave = nome EN normalizado */
const entities = new Map();
const aliasIndex = new Map(); // nome alternativo normalizado -> chave canônica

function keyOf(name) {
  const k = normKey(name);
  return aliasIndex.get(k) ?? k;
}

function upsert(nameEn, init) {
  const k = keyOf(nameEn);
  let e = entities.get(k);
  if (!e) {
    e = {
      name_en: nameEn,
      aliases_en: [],
      type: init.type,
      category: init.category,
      categories: [init.category],
      subcategory: init.subcategory ?? null,
      wiki_title: curated.wiki_titles[nameEn] ?? init.wiki_title ?? nameEn,
      dlc: null,
      amiibo: null,
      variants: [],
      sources: new Set(),
      facts: {},
      tags: new Set(),
    };
    entities.set(k, e);
  }
  if (init.extraCategory && !e.categories.includes(init.extraCategory)) e.categories.push(init.extraCategory);
  if (init.source) e.sources.add(init.source);
  for (const t of init.tags ?? []) e.tags.add(t);
  return e;
}

function addAlias(entity, alias) {
  const k = normKey(alias);
  if (k === normKey(entity.name_en)) return;
  if (!entity.aliases_en.includes(alias)) entity.aliases_en.push(alias);
  aliasIndex.set(k, normKey(entity.name_en));
}

// aliases conhecidos entre grafias de fontes diferentes
for (const [canon, alts] of Object.entries(curated.aliases_en)) {
  for (const a of alts) aliasIndex.set(normKey(a), normKey(canon));
}

const clean = (s) => wikiToText(s ?? '').replace(/\s+/g, ' ').trim();
function stripTemplates(s, names) {
  let out = String(s);
  for (;;) {
    const m = out.match(new RegExp('\\{\\{(' + names.join('|') + ')\\|'));
    if (!m) return out;
    let depth = 0, i = m.index;
    for (; i < out.length - 1; i++) {
      if (out[i] === '{' && out[i + 1] === '{') { depth++; i++; }
      else if (out[i] === '}' && out[i + 1] === '}') { depth--; i++; if (depth === 0) break; }
    }
    out = out.slice(0, m.index) + out.slice(i + 1);
  }
}
const cleanName = (s) => clean(stripTemplates(s, ['Exp', 'List Note', 'DLC']));
const dlcOf = (s) => (/\{\{DLC\|TMT\}\}/.test(s) ? 'TMT' : /\{\{DLC\|TCB\}\}/.test(s) ? 'TCB' : null);
const amiiboOf = (s) => {
  if (!/amiibo/.test(s)) return null;
  const m = String(s).match(/\{\{(?:Exp|List Note)\|([\s\S]*amiibo[\s\S]*?)\}\}\s*$/);
  return m ? clean(m[1].replace(/^Obtained randomly from the Treasure Chests? dropped by scanning /, '')) : null;
};
const num = (s) => {
  // "8,000" é separador de milhar, não decimal
  const m = String(s ?? '').replace(/(\d),(\d{3})(?!\d)/g, '$1$2').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

// ---------------------------------------------------------------- 1. Hyrule Compendium
const comp = raw('compendium.json').entries;

function creatureSub(id) {
  if ([1, 2, 3, 4, 5].includes(id)) return 'montarias';
  if ([7, 8, 29, 66].includes(id)) return 'especiais';
  if (id <= 28) return 'animais';
  if (id <= 47) return 'aves';
  if (id <= 60) return 'peixes';
  if (id <= 65) return 'frutos_do_mar';
  if (id <= 78) return 'insetos';
  return 'anfibios_e_repteis';
}
function monsterSub(id, name) {
  if (/lynel/.test(name)) return 'minichefes';
  if (id >= 125 && id <= 133) return 'guardioes';
  if (id >= 134 && id <= 135) return 'cla_yiga';
  if (id === 136 || id === 137 || id >= 159) return 'chefes';
  if (id >= 138 && id <= 152 && !/pebblit/.test(name)) return 'minichefes';
  if (id >= 153 && id <= 155) return 'dragoes';
  return 'inimigos_comuns';
}

for (const c of comp) {
  const nameEn = curated.compendium_names[c.name] ?? titleCaseEn(c.name);
  let type, category, subcategory;
  const id = c.id;
  if (c.master_mode) {
    type = 'monster';
    category = 'monstros';
    subcategory = /lynel/.test(c.name) ? 'minichefes' : 'inimigos_comuns';
  } else if (c.category === 'creatures') {
    type = 'creature';
    category = 'criaturas';
    subcategory = creatureSub(id);
  } else if (c.category === 'monsters') {
    type = 'monster';
    category = 'monstros';
    subcategory = monsterSub(id, c.name);
  } else if (c.category === 'materials') {
    type = 'material';
    category = 'materiais';
  } else if (c.category === 'treasure') {
    type = 'treasure';
    category = 'tesouros';
    subcategory = id === 386 ? 'baus' : 'depositos';
  } else if (c.category === 'equipment') {
    if (id <= 322) [type, category] = ['weapon', 'armas'];
    else if (id <= 347) [type, category] = ['bow', 'arcos'];
    else if (id <= 353) [type, category] = ['arrow', 'flechas'];
    else [type, category] = ['shield', 'escudos'];
  }
  if (!subcategory && ['arcos', 'escudos', 'flechas'].includes(category)) subcategory = category;
  const e = upsert(nameEn, {
    type,
    category,
    subcategory,
    wiki_title: curated.wiki_titles[nameEn] ?? nameEn,
    source: 'compendium',
    tags: c.master_mode ? ['modo_mestre'] : [],
  });
  if (c.edible && category === 'criaturas') e.categories.push('materiais');
  e.dlc = e.dlc ?? (c.dlc ? 'DLC' : null);
  e.facts.compendium = {
    number: c.id,
    master_mode: c.master_mode,
    name: c.name,
    description: c.description,
    common_locations: c.common_locations ?? [],
    drops: c.drops ?? [],
    edible: c.edible ?? null,
    hearts_recovered: c.hearts_recovered ?? null,
    cooking_effect: c.cooking_effect || null,
    properties: c.properties ?? null,
    dlc: c.dlc,
    image: c.image,
  };
}

// ---------------------------------------------------------------- 2. Listas de equipamento (Zelda Wiki)
const weaponTable = parseDataTables(page('weapons_in_breath_of_the_wild'))[0];
const CAT_MAP = { 'One-Handed Weapon': 'uma_mao', 'Two-Handed Weapon': 'duas_maos', Spear: 'lancas' };
for (const row of weaponTable.rows) {
  const [nameCell, compNo, archetype, catCell, withShield, attack, durability, desc] = row;
  const nameEn = cleanName(nameCell);
  const cat = clean(catCell);
  const e = upsert(nameEn, {
    type: 'weapon',
    category: 'armas',
    subcategory: CAT_MAP[cat] ?? null,
    source: 'zeldawiki:weapons',
  });
  e.subcategory = CAT_MAP[cat] ?? e.subcategory;
  if (!CAT_MAP[cat]) conflict('categoria_arma_desconhecida', { name: nameEn, value: cat });
  e.dlc = e.dlc === 'DLC' || !e.dlc ? dlcOf(nameCell) ?? e.dlc : e.dlc;
  e.amiibo = amiiboOf(nameCell) ?? e.amiibo;
  e.facts.weapon = {
    compendium_no: clean(compNo),
    archetype: clean(archetype),
    category: cat,
    with_shield: clean(withShield),
    attack_text: clean(attack),
    attack: num(clean(attack)),
    durability_text: clean(durability),
    durability: num(clean(durability)),
    description: clean(desc),
  };
}

const shieldTable = parseDataTables(page('shields_in_breath_of_the_wild'))[0];
for (const row of shieldTable.rows) {
  const [nameCell, compNo, guard, durability, composition, desc] = row;
  const nameEn = cleanName(nameCell);
  const e = upsert(nameEn, { type: 'shield', category: 'escudos', subcategory: 'escudos', source: 'zeldawiki:shields' });
  e.amiibo = amiiboOf(nameCell) ?? e.amiibo;
  e.dlc = e.dlc === 'DLC' || !e.dlc ? dlcOf(nameCell) ?? e.dlc : e.dlc;
  e.facts.shield = {
    compendium_no: clean(compNo),
    guard_text: clean(guard),
    guard: num(clean(guard)),
    durability_text: clean(durability),
    durability: num(clean(durability)),
    composition: clean(composition),
    description: clean(desc),
  };
}

const bowTable = parseDataTables(page('bows_in_breath_of_the_wild'))[0];
for (const row of bowTable.rows) {
  const [nameCell, compNo, strength, durability, range, desc] = row;
  const nameEn = cleanName(nameCell);
  const e = upsert(nameEn, { type: 'bow', category: 'arcos', subcategory: 'arcos', source: 'zeldawiki:bows' });
  e.amiibo = amiiboOf(nameCell) ?? e.amiibo;
  e.facts.bow = {
    compendium_no: clean(compNo),
    strength_text: clean(strength),
    strength: num(clean(strength)),
    durability_text: clean(durability),
    durability: num(clean(durability)),
    range: num(clean(range)),
    description: clean(desc),
  };
}

// propriedades (BotWItemProperties): só anexa a entidades existentes; o resto vira conflito a revisar
const listed = new Set([...entities.keys()]);
for (const r of raw('zeldawiki/item_properties.json').rows) {
  const k = keyOf(r.page);
  const e = entities.get(k);
  const facts = {
    type: r.type,
    strength: num(r.strength),
    durability: num(r.durability),
    multishot: num(r.multishot),
    multishot_angle: num(r.multishot_angle),
    flammable: r.flammable === '1' ? true : r.flammable === '0' ? false : null,
    magnetic: r.magnetic === '1' ? true : r.magnetic === '0' ? false : null,
    buoyant: r.buoyant === '1' ? true : r.buoyant === '0' ? false : null,
    conductive: r.conductive === '1' ? true : r.conductive === '0' ? false : null,
    guardian: r.guardian === '1' ? true : r.guardian === '0' ? false : null,
    throwable: r.throw === '1' ? true : r.throw === '0' ? false : null,
    throw_effect: clean(r['throw effect'] ?? r.throw_effect ?? '') || null,
    distance: num(r.distance),
    multiplier: num(r.multiplier),
    zoom: r.zoom === '1' ? true : r.zoom === '0' ? false : null,
    reflect: r.reflect === '1' ? true : r.reflect === '0' ? false : null,
    bash: r.bash === '1' ? true : r.bash === '0' ? false : null,
  };
  if (e && listed.has(k)) e.facts.properties = facts;
  else if (curated.extra_equipment[r.page]) {
    const x = curated.extra_equipment[r.page];
    const ne = upsert(r.page, { type: x.type, category: x.category, subcategory: x.subcategory, source: 'zeldawiki:properties' });
    ne.facts.properties = facts;
    ne.amiibo = x.amiibo ?? null;
    for (const t of x.tags ?? []) ne.tags.add(t);
  } else if (curated.props_ignore?.[r.page]) {
    conflict('propriedades_ignoradas', { name: r.page, note: curated.props_ignore[r.page] });
  } else if (!['Mount'].includes(r.type)) {
    conflict('propriedades_sem_item_canonico', {
      name: r.page,
      type: r.type,
      note: 'Presente em BotWItemProperties mas ausente das listas canônicas de equipamento de BOTW.',
    });
  } else if (e) e.facts.properties = facts;
}

// ---------------------------------------------------------------- 3. Tabelas de materiais e comidas
const dt = raw('zeldawiki/data_tables.json').rows;
function tableRows(pageName, tableName) {
  const cells = dt.filter((r) => r.page === pageName && r.tableName === tableName);
  if (!cells.length) return [];
  const header = cells.find((c) => c.columns);
  // cabeçalhos agrupadores ("[Colspan:N]") não correspondem a células próprias
  const columns = (header?.columns ?? '')
    .split(',')
    .filter((c) => !/\[Colspan:\d+\]/.test(c))
    .map((c) => c.replace(/\[.*?\]/g, '').trim());
  const byRow = new Map();
  for (const c of cells) {
    if (c.rowIndex === '' || c.rowIndex == null) continue;
    if (!byRow.has(c.rowIndex)) byRow.set(c.rowIndex, {});
    byRow.get(c.rowIndex)[columns[Number(c.columnIndex) - 1] ?? c.columnIndex] = c.cell;
  }
  return [...byRow.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([, r]) => r);
}

const MATERIAL_TABLES = {
  Fruit: 'frutas',
  Nuts: 'frutas',
  Mushrooms: 'cogumelos',
  Vegetables: 'vegetais',
  Plants: 'ervas_e_flores',
  Flowers: 'ervas_e_flores',
  Meats: 'carnes',
  Ingredients: 'ingredientes',
  Fish: 'peixes',
  Crabs: 'frutos_do_mar',
  Snails: 'frutos_do_mar',
  Insects: 'insetos',
  Frogs: 'anfibios_e_repteis',
  Lizards: 'anfibios_e_repteis',
  'Monster Parts': 'partes_de_monstros',
  'Ancient Materials': 'materiais_ancestrais',
  'Dragon Parts': 'partes_de_dragao',
  Ores: 'minerais',
  'BotW Materials': 'diversos',
};
for (const [table, sub] of Object.entries(MATERIAL_TABLES)) {
  for (const r of tableRows('Materials in Breath of the Wild', table)) {
    const nameEn = cleanName(r.Material);
    const existing = entities.get(keyOf(nameEn));
    let e;
    if (existing && existing.category === 'criaturas') {
      e = existing;
      if (!e.categories.includes('materiais')) e.categories.push('materiais');
      e.sources.add('zeldawiki:materials');
    } else {
      e = upsert(nameEn, { type: 'material', category: 'materiais', subcategory: sub, source: 'zeldawiki:materials' });
      if (e.category === 'materiais') e.subcategory = sub;
    }
    e.facts.material = {
      table,
      subcategory: sub,
      description: clean(r.Description),
      value_text: clean(r.Value),
      value: num(clean(r.Value)),
      uses: clean(r['Additional uses']).split(/\s*(?:<br\/?>|\n)\s*/).filter(Boolean),
      uses_raw: wikiToText(r['Additional uses'] ?? ''),
    };
  }
}

// partes de monstros: a tabela do artigo "Monster Part" traz HP/valores extras
for (const r of tableRows('Monster Part', 'Monster Parts')) {
  const vals = Object.values(r);
  const nameEn = cleanName(vals[0]);
  const e = entities.get(keyOf(nameEn));
  if (!e) {
    conflict('parte_de_monstro_fora_da_lista', { name: nameEn });
    continue;
  }
  e.facts.monster_part_table = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, clean(v)]));
}

const FOOD_TABLES = { Meals: 'pratos', 'Roasted Food': 'assados_e_tostados', 'Frozen Food': 'congelados', Elixirs: 'elixires' };
for (const [table, sub] of Object.entries(FOOD_TABLES)) {
  for (const r of tableRows('Food in Breath of the Wild', table)) {
    const nameEn = cleanName(r.Item);
    const e = upsert(nameEn, {
      type: sub === 'elixires' ? 'elixir' : 'food',
      category: 'culinaria',
      subcategory: sub,
      source: 'zeldawiki:food',
    });
    e.facts.food = {
      table,
      ingredients: clean(r.Ingredients ?? r.Ingredient),
      // divide pelas vírgulas literais antes de decodificar "&#44;" (vírgulas internas de um mesmo item)
      ingredients_list: String(r.Ingredients ?? r.Ingredient ?? '')
        .split(/,|\n|<br\s*\/?>/)
        .map((x) => wikiToText(x).trim())
        .filter(Boolean),
      effect: clean(r.Effect),
      hearts: num(clean(r.Effect)),
      sell_price: num(clean(r['Sell Price'])),
      description: clean(r.Description),
    };
  }
}

// ---------------------------------------------------------------- 4. Armaduras e conjuntos
const PART = { Head: 'cabeca', Chest: 'torso', Legs: 'pernas' };
const levels = raw('zeldawiki/armor_levels.json').rows;
const setMembers = new Map();
for (const r of raw('zeldawiki/armor.json').rows) {
  const nameEn = r.armor.replace(/ \(Item\)$/, '');
  const e = upsert(nameEn, {
    type: 'armor',
    category: 'armaduras',
    subcategory: PART[r.bodyPart] ?? null,
    wiki_title: r.armor,
    source: 'zeldawiki:armor',
  });
  const lv = levels
    .filter((l) => l.armor === r.armor)
    .map((l) => ({
      level: (l.level || '').length,
      defense: num(l.defense),
      sell_price: num(l.sellPrice),
      materials: (l.materials || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => {
          const m = x.match(/^(\d+)\s+(.+)$/);
          return m ? { qty: Number(m[1]), item: m[2] } : { qty: null, item: x };
        }),
    }))
    .sort((a, b) => a.level - b.level);
  e.facts.armor = {
    set: r.armorSet || null,
    body_part: r.bodyPart,
    effects: (r.effects || '').split(',').map((x) => x.trim()).filter(Boolean),
    levels: lv,
  };
  if (r.armorSet) {
    if (!setMembers.has(r.armorSet)) setMembers.set(r.armorSet, []);
    setMembers.get(r.armorSet).push(nameEn);
  }
}
for (const [setName, members] of setMembers) {
  const e = upsert(setName, {
    type: 'armor_set',
    category: 'armaduras',
    subcategory: 'conjuntos',
    wiki_title: curated.wiki_titles[setName] ?? setName,
    source: 'zeldawiki:armor',
  });
  e.facts.armor_set = { members };
}

// DLC e amiibo das armaduras: notas da lista "Armor in Breath of the Wild" ({{Armor List|BotW ...}})
{
  const w = page('armor_in_breath_of_the_wild');
  const start = w.indexOf('{{Armor List');
  const body = w.slice(start, w.indexOf('\n}}', start));
  const namedNotes = new Map();
  for (const chunk of body.split(/\n\|-\s*\n/)) {
    const cells = chunk
      .split('\n')
      .filter((l) => l.startsWith('|'))
      .map((l) => l.slice(1).trim());
    if (cells.length < 2) continue;
    const [noteCell, nameCell] = cells;
    const e = entities.get(keyOf(cleanName(nameCell)));
    if (!e) continue;
    const dlc = dlcOf(noteCell);
    if (dlc) e.dlc = dlc;
    const nm = noteCell.match(/\{\{List Note\|name=\s*([^|}]+?)\s*(?:\|([\s\S]*?))?\}\}\s*$/);
    let note = noteCell.match(/\{\{List Note\|(?!name=)([\s\S]*)\}\}\s*$/)?.[1] ?? null;
    if (nm) {
      if (nm[2]) namedNotes.set(nm[1], nm[2]);
      note = nm[2] ?? namedNotes.get(nm[1]) ?? null;
    }
    if (note && /amiibo/.test(note)) {
      e.amiibo = clean(note.replace(/^Obtained randomly from the Treasure Chests? dropped by scanning /, '').replace(/\. Requires the [\s\S]*$/, ''));
      if (/1\.3\.3/.test(note)) e.facts.armor_note = 'Requer a atualização 1.3.3';
    } else if (note && !dlc) e.facts.armor_note = clean(note);
  }
  // a página específica do item prevalece sobre a lista geral quando cita um único DLC
  for (const e of entities.values()) {
    if (e.category !== 'armaduras' || e.type !== 'armor') continue;
    let wt;
    try {
      wt = readJson(p('data/raw/zeldawiki/pages', slugify(e.wiki_title) + '.json')).wikitext;
    } catch {
      continue;
    }
    // só marcadores explícitos; menções em texto ("...in The Champions' Ballad") não indicam origem do item
    const tmt = /\{\{(?:DLC\|)?TMT\}\}/.test(wt);
    const tcb = /\{\{(?:DLC\|)?TCB\}\}/.test(wt);
    const own = tmt && !tcb ? 'TMT' : tcb && !tmt ? 'TCB' : null;
    if (own && e.dlc && own !== e.dlc) conflict('dlc_divergente', { name: e.name_en, lista: e.dlc, pagina_do_item: own, escolhido: own });
    if (own) e.dlc = own;
  }
  // conjuntos herdam DLC/amiibo das peças
  for (const [setName, members] of setMembers) {
    const set = entities.get(keyOf(setName));
    const ms = members.map((m) => entities.get(keyOf(m))).filter(Boolean);
    if (ms.length && ms.every((m) => m.dlc)) set.dlc = ms[0].dlc;
    if (ms.length && ms.every((m) => m.amiibo)) set.amiibo = ms[0].amiibo;
  }
}

// ---------------------------------------------------------------- 5. Itens-chave
const keyTable = parseDataTables(page('key_items_in_breath_of_the_wild'))[0];
for (const row of keyTable.rows) {
  const [nameCell, desc, obtained] = row;
  const dlc = dlcOf(nameCell);
  const nameEn = cleanName(nameCell);
  const base = nameEn.match(/^(.*?)\s*\+$/);
  if (base) {
    // variante "+" das habilidades dos Campeões: incorporada à ficha base
    const e = entities.get(keyOf(base[1]));
    e.variants.push({ name_en: nameEn, dlc, description: clean(desc), obtained_from: clean(obtained) });
    continue;
  }
  const isChampion = /Grace|Gale|Protection|Fury/.test(nameEn);
  const isHorseGear = /Bridle|Saddle/.test(nameEn);
  const e = upsert(nameEn, {
    type: isChampion ? 'ability' : 'key_item',
    category: isChampion ? 'runas' : 'itens_chave',
    subcategory: isChampion ? 'habilidades_dos_campeoes' : isHorseGear ? 'equipamento_de_montaria' : 'itens_chave',
    source: 'zeldawiki:key_items',
  });
  e.dlc = dlc ?? e.dlc;
  e.facts.key_item = { description: clean(desc), obtained_from: clean(obtained) };
  if (/amiibo/i.test(obtained)) e.amiibo = clean(obtained).replace(/\s*\(using amiibo Rune\)\s*$/i, '');
}

// ---------------------------------------------------------------- 6. Listas curadas
for (const c of curated.entities) {
  const e = upsert(c.name_en, {
    type: c.type,
    category: c.category,
    subcategory: c.subcategory,
    wiki_title: c.wiki_title ?? c.name_en,
    source: 'curadoria',
    tags: c.tags,
  });
  if (c.extraCategory) e.categories.push(c.extraCategory);
  e.dlc = c.dlc ?? e.dlc;
  e.amiibo = c.amiibo ?? e.amiibo;
  e.facts.curated = { note: c.note ?? null, extra_wiki_titles: c.extra_wiki_titles ?? [] };
  for (const v of c.variants ?? []) e.variants.push(v);
}

// variantes que são entidades próprias mas formam família (ex.: Espada Guardiã, +, ++)
for (const fam of curated.families) {
  for (const m of fam.members) {
    const e = entities.get(keyOf(m));
    if (!e) conflict('familia_membro_ausente', { family: fam.name, member: m });
    else e.family = fam.name;
  }
}

// ---------------------------------------------------------------- 7. Lojas (Wares)
for (const w of raw('zeldawiki/wares.json').rows) {
  const e = entities.get(keyOf(clean(w.item)));
  if (!e) continue;
  (e.facts.wares ??= []).push({
    shop: w.page,
    price_rupees: num(w.priceRupees),
    price: clean(w.price),
    quantity: num(w.quantity),
    stock: num(w.stock),
    restock: clean(w.restockInfo),
  });
}

// ---------------------------------------------------------------- 7b. DLC: Modo Mestre e correções curadas
for (const e of entities.values()) if (e.facts.compendium?.master_mode) e.dlc = 'TMT';
for (const [name, dlc] of Object.entries(curated.dlc_overrides ?? {})) {
  const e = entities.get(keyOf(name));
  if (e) e.dlc = dlc;
  else conflict('dlc_override_sem_entidade', { name });
}
// "DLC" genérico do compendium sem identificação do pacote: mantém o marcador genérico

// ---------------------------------------------------------------- 8. Exclusões explícitas
for (const name of curated.exclude) {
  const k = keyOf(name);
  if (entities.has(k)) {
    entities.delete(k);
    conflict('excluido_por_curadoria', { name, reason: curated.exclude_reasons?.[name] ?? '' });
  }
}

// ---------------------------------------------------------------- 9. ids, saída
const TYPE_PREFIX = {
  material: 'material',
  creature: 'creature',
  monster: 'monster',
  weapon: 'weapon',
  bow: 'bow',
  arrow: 'arrow',
  shield: 'shield',
  armor: 'armor',
  armor_set: 'armorset',
  food: 'food',
  elixir: 'elixir',
  key_item: 'keyitem',
  rune: 'rune',
  ability: 'ability',
  mechanic: 'mechanic',
  treasure: 'treasure',
  object: 'object',
};
const out = [];
const ids = new Set();
for (const e of entities.values()) {
  let id = `botw_${TYPE_PREFIX[e.type]}_${slugify(e.name_en)}`;
  if (e.facts.compendium?.master_mode) id += '_mm';
  if (ids.has(id)) {
    conflict('id_duplicado', { id, name: e.name_en });
    id += '_2';
  }
  ids.add(id);
  if (!e.subcategory) conflict('sem_subcategoria', { id, name: e.name_en, category: e.category });
  out.push({
    id,
    ...e,
    categories: [...new Set(e.categories)],
    sources: [...e.sources],
    tags: [...e.tags],
  });
}
out.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));

writeJson(p('data/inventory/inventory.json'), out);
const titles = new Set();
for (const e of out) {
  titles.add(e.wiki_title);
  for (const t of e.facts.curated?.extra_wiki_titles ?? []) titles.add(t);
}
for (const t of curated.mechanic_reference_pages) titles.add(t);
writeJson(p('data/inventory/wiki-titles.json'), [...titles].sort());
writeJson(p('data/inventory/conflicts.json'), conflicts);

const byCat = {};
for (const e of out) byCat[e.category] = (byCat[e.category] ?? 0) + 1;
log(`inventário: ${out.length} entidades`, byCat);
log(`conflitos/alertas: ${conflicts.length} (data/inventory/conflicts.json)`);
