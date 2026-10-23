// Importa tabelas estruturadas (Cargo) do Zelda Wiki (https://zeldawiki.wiki).
// Texto do Zelda Wiki sob GNU FDL 1.3; dados numéricos derivam do jogo (© Nintendo).
import { fetchJson, writeJson, p, log, sleep } from '../lib/util.mjs';

const API = 'https://zeldawiki.wiki/w/api.php';

async function cargo(tables, fields, where, orderBy) {
  const out = [];
  for (let offset = 0; ; offset += 500) {
    const params = new URLSearchParams({
      action: 'cargoquery',
      format: 'json',
      tables,
      fields,
      limit: '500',
      offset: String(offset),
    });
    if (where) params.set('where', where);
    if (orderBy) params.set('order_by', orderBy);
    let data;
    for (let attempt = 0; attempt < 6; attempt++) {
      data = await fetchJson(`${API}?${params}`);
      if (!data?.error) break;
      // o Cargo devolve MWException intermitente; repetir com espera.
      await sleep(2000 * (attempt + 1));
    }
    if (data?.error) throw new Error(`${tables}: ${JSON.stringify(data.error)}`);
    const rows = data.cargoquery.map((r) => r.title);
    out.push(...rows);
    if (rows.length < 500) break;
    await sleep(300);
  }
  return out;
}

const queries = {
  item_properties: [
    'BotWItemProperties',
    '_pageName=page,type,strength,durability,multishot,multishot_angle,flammable,magnetic,buoyant,conductive,guardian,throw,throw_effect,distance,multiplier,zoom,reflect,bash',
    null,
    'page',
  ],
  armor: ['Armor', '_pageName=page,armorSet,bodyPart,armor,effects,hasArmorSet,hasEffects', "game='BotW'", 'armor'],
  armor_levels: [
    'ArmorLevels',
    '_pageName=page,armor,level,defense,sellPrice,sellable,materials,description',
    "game='BotW'",
    'armor,defense',
  ],
  upgrades: ['Upgrades', '_pageName=page,baseItem,level,item,upgrade,location,materials,cost', "game='BotW'", 'baseItem,level'],
  wares: [
    'Wares',
    '_pageName=page,item,quantity,displayText,price,priceRupees,priceName,stock,restockInfo,description',
    "game='BotW'",
    'page,item',
  ],
  descriptions: [
    'Descriptions',
    '_pageName=page,descriptionSource,subject,context,subjectDisplayName,description,image,section',
    "game='BotW'",
    'subject',
  ],
  data_tables: [
    'DataTables',
    '_pageName=page,tableName,columns,rowIndex,columnIndex,cell',
    "game='BotW'",
    'tableName,rowIndex,columnIndex',
  ],
  nomenclature_ptb: [
    'Nomenclature',
    '_pageName=page,subject,subjectType,translation,ref,note,meaning',
    "game='BotW' AND lang='ptB'",
    'subject',
  ],
  files: ['Files', '_pageName=page,type,licensing,subject,width,height,source', "game='BotW'", 'page'],
};

const only = process.argv.slice(2);
for (const [name, [tables, fields, where, order]] of Object.entries(queries)) {
  if (only.length && !only.includes(name)) continue;
  const rows = await cargo(tables, fields, where, order);
  writeJson(p(`data/raw/zeldawiki/${name}.json`), {
    source: `${API}?action=cargoquery&tables=${tables}`,
    where,
    fetched_at: new Date().toISOString(),
    license: 'Zelda Wiki — texto sob GNU Free Documentation License 1.3',
    count: rows.length,
    rows,
  });
  log(`zeldawiki ${name}: ${rows.length} linhas`);
}
