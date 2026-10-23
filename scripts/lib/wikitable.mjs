// Parser mínimo para tabelas {{Data Table ...}} do Zelda Wiki: devolve linhas como arrays de células (wikitext cru).
export function parseDataTables(wikitext) {
  const tables = [];
  const re = /\{\{Data Table\b/g;
  let m;
  while ((m = re.exec(wikitext))) {
    // encontra o fechamento balanceado de {{ }}
    let depth = 0, i = m.index, end = -1;
    for (; i < wikitext.length - 1; i++) {
      if (wikitext[i] === '{' && wikitext[i + 1] === '{') { depth++; i++; }
      else if (wikitext[i] === '}' && wikitext[i + 1] === '}') { depth--; i++; if (depth === 0) { end = i + 1; break; } }
    }
    const body = wikitext.slice(m.index + 2, end - 2);
    const colsMatch = body.match(/\|columns\s*=\s*([^\n]*)/);
    const columns = colsMatch ? splitTop(colsMatch[1], ',').map((c) => c.replace(/\[.*?\]/g, '').trim()) : [];
    const parts = splitRows(body);
    // a primeira parte contém os parâmetros nomeados (|game=, |columns=...) e, às vezes, já a primeira linha
    const first = parts[0]
      .split('\n')
      .filter((l) => !/^\|\s*[\w ]+\s*=/.test(l) && !/^\{\{Data Table/.test(l) && !/^Data Table/.test(l))
      .join('\n');
    const rows = [first, ...parts.slice(1)].map((r) => splitCells(r)).filter((r) => r.length && r.some((c) => c));
    tables.push({ columns, rows, offset: m.index });
  }
  return tables;
}

function splitTop(s, sep) {
  const out = []; let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; cur += two; i++; continue; }
    if (s[i] === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += s[i];
  }
  out.push(cur);
  return out;
}

function splitRows(body) {
  // separadores de linha "|-" no nível superior
  const out = []; let depth = 0, cur = '';
  const lines = body.split('\n');
  for (const line of lines) {
    if (depth === 0 && /^\|-\s*$/.test(line.trim())) { out.push(cur); cur = ''; continue; }
    for (let i = 0; i < line.length - 1; i++) {
      const two = line.slice(i, i + 2);
      if (two === '{{' || two === '[[') { depth++; i++; } else if (two === '}}' || two === ']]') { depth--; i++; }
    }
    cur += line + '\n';
  }
  out.push(cur);
  return out;
}

function splitCells(row) {
  const cells = []; let depth = 0, cur = null;
  for (const line of row.split('\n')) {
    if (depth === 0 && line.startsWith('|')) {
      if (cur !== null) cells.push(cur.trim());
      cur = line.slice(1);
    } else if (cur !== null) cur += '\n' + line;
    for (let i = 0; i < line.length - 1; i++) {
      const two = line.slice(i, i + 2);
      if (two === '{{' || two === '[[') { depth++; i++; } else if (two === '}}' || two === ']]') { depth--; i++; }
    }
  }
  if (cur !== null) cells.push(cur.trim());
  return cells.filter((c, i) => !(i === cells.length - 1 && c === '}}'));
}
