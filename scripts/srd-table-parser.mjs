/** Parse weapon and armor rows from HTML tables in the bundled SRD 5.2.1 document. */

function normalizeKey(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTableRows(tableHtml) {
  const rows = [];
  const rowRe = /<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]*)<\/td>/gi;
  let match;
  while ((match = rowRe.exec(tableHtml))) {
    const name = match[1].trim();
    if (!name || name.startsWith("<")) continue;
    rows.push({
      name,
      detail: match[2].trim() || null,
    });
  }
  return rows;
}

function findRowOffset(body, name, searchFrom, searchTo) {
  const slice = body.slice(searchFrom, searchTo);
  const idx = slice.indexOf(`<td>${name}</td>`);
  if (idx < 0) {
    const loose = slice.indexOf(name);
    return loose >= 0 ? searchFrom + loose : searchFrom;
  }
  return searchFrom + idx;
}

/**
 * @param {string} body
 * @returns {{ weapons: object[], armor: object[] }}
 */
export function parseEquipmentTables(body) {
  const weaponsStart = body.indexOf("### Weapons\n");
  const armorStart = body.indexOf("### Armor\n", weaponsStart);
  const toolsStart = body.indexOf("### Tools\n", armorStart);
  if (weaponsStart < 0 || armorStart < 0) {
    return { weapons: [], armor: [] };
  }

  const weaponsSection = body.slice(weaponsStart, armorStart);
  const armorSection = body.slice(armorStart, toolsStart > 0 ? toolsStart : armorStart + 50000);

  const weaponTables = weaponsSection.match(/<table>[\s\S]*?<\/table>/gi) ?? [];
  const armorTables = armorSection.match(/<table>[\s\S]*?<\/table>/gi) ?? [];

  const weapons = [];
  for (const table of weaponTables) {
    for (const row of parseTableRows(table)) {
      const key = normalizeKey(row.name);
      const start = findRowOffset(body, row.name, weaponsStart, armorStart);
      weapons.push({
        key,
        name: row.name,
        subtitle: row.detail,
        start,
        end: start + row.name.length + 80,
        chapter: "equipment",
      });
    }
  }

  const armor = [];
  for (const table of armorTables) {
    for (const row of parseTableRows(table)) {
      const key = normalizeKey(row.name);
      const start = findRowOffset(body, row.name, armorStart, toolsStart > 0 ? toolsStart : body.length);
      armor.push({
        key,
        name: row.name,
        subtitle: row.detail,
        start,
        end: start + row.name.length + 120,
        chapter: "equipment",
      });
    }
  }

  return { weapons, armor };
}
