/**
 * Puts back the empty cells of the daily-stage tables on the route pages.
 *
 * The import (extract.mjs, stripEmpties) used to drop every empty <td>, so a
 * stage with no altitude reading lost that cell and the rest of its row slid
 * one column left: the riding time showed up under altitude, and so on. This
 * lines each row up with the old site's original in .mirror and re-inserts an
 * empty <td> wherever one was dropped — in the German content
 * (content/generated/pages.json) and in the English translations
 * (content/translations/en/route/*.html), whose rows match the German ones.
 * Run `npm run translations` afterwards to rebuild en.json.
 *
 * Safe to run again: rows that already have every cell are left alone.
 *
 * Usage: node scripts/fix-route-stages.mjs [.mirror]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseHtml } from "node-html-parser";

// keep the <!-- title: … --> line of the translation files
const parse = (html) => parseHtml(html, { comment: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const MIRROR = join(ROOT, process.argv[2] ?? ".mirror");
const PAGES = join(ROOT, "content", "generated", "pages.json");
const EN = join(ROOT, "content", "translations", "en");

/** The same test stripEmpties used, so we know which cells it dropped. */
const dropped = (td) =>
  !td.text.replace(/ |\s/g, "") && td.querySelectorAll("img,iframe,br,a,table").length === 0;

/** Stage tables: one column per figure, so their first row is wide. */
const stageTables = (root) =>
  root.querySelectorAll("table").filter((t) => (t.querySelector("tr")?.querySelectorAll("th,td").length ?? 0) >= 7);

/** For each original row that survived the import: which of its cells did. */
function originalRows(html) {
  // Each table parsed on its own: some old pages carry a stray </table>
  // (China) that would otherwise end the document's tables early.
  const tables = (html.match(/<table[\s\S]*?<\/table>/gi) ?? []).flatMap((t) => stageTables(parse(t)));
  return tables.map((table) =>
    table
      .querySelectorAll("tr")
      .map((tr) => tr.querySelectorAll("td").map((td) => !dropped(td)))
      .filter((kept) => kept.some(Boolean)),
  );
}

/** Re-inserts the dropped cells; returns the new html and how many it added. */
function restore(html, original, label) {
  const root = parse(html);
  const tables = stageTables(root);
  if (tables.length !== original.length) {
    console.warn(`  ${label}: ${tables.length} stage tables, original has ${original.length} — skipped`);
    return { html, added: 0 };
  }
  let added = 0;
  tables.forEach((table, t) => {
    const rows = table.querySelectorAll("tr").filter((tr) => tr.querySelectorAll("td").length > 0);
    const want = original[t].filter((kept) => kept.length > 0);
    if (rows.length !== want.length) {
      console.warn(`  ${label}: table ${t + 1} has ${rows.length} rows, original ${want.length} — skipped`);
      return;
    }
    rows.forEach((tr, r) => {
      const cells = tr.querySelectorAll("td");
      const kept = want[r];
      if (cells.length === kept.length) return; // already complete
      if (cells.length !== kept.filter(Boolean).length) {
        console.warn(`  ${label}: row ${r + 1} has ${cells.length} cells, expected ${kept.filter(Boolean).length} — skipped`);
        return;
      }
      // one cell per line, indented as the row was, so the files stay
      // readable for whoever corrects a translation by hand
      const indent = tr.innerHTML.match(/^\s*/)[0] || "\n";
      const close = tr.innerHTML.match(/\s*$/)[0];
      let next = 0;
      const html = kept.map((isKept) => (isKept ? cells[next++].toString() : "<td></td>")).join(indent);
      tr.set_content(indent + html + close);
      added += kept.length - cells.length;
    });
  });
  return { html: added ? root.toString() : html, added };
}

const pages = JSON.parse(readFileSync(PAGES, "utf8"));
let total = 0;
for (const [oldPath, page] of Object.entries(pages)) {
  if (!oldPath.startsWith("5route/") || !page.path.startsWith("/route/")) continue;
  const source = join(MIRROR, oldPath);
  if (!existsSync(source)) continue;
  const original = originalRows(readFileSync(source, "utf8"));
  if (!original.length) continue;

  const de = restore(page.html, original, `${page.path} (de)`);
  if (de.added) page.html = de.html;

  const enFile = join(EN, `${page.path.replace(/^\//, "")}.html`);
  let enAdded = 0;
  if (existsSync(enFile)) {
    const en = restore(readFileSync(enFile, "utf8"), original, `${page.path} (en)`);
    if (en.added) writeFileSync(enFile, en.html);
    enAdded = en.added;
  }
  if (de.added || enAdded) console.log(`${page.path}: ${de.added} cells (de), ${enAdded} (en)`);
  total += de.added + enAdded;
}
writeFileSync(PAGES, JSON.stringify(pages, null, 1)); // the file's own layout
console.log(`\n${total} empty cells restored.`);
