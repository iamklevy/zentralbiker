/**
 * Writes content/generated/paths.json: every page the site serves, by its
 * internal (German) path. i18n/pathnames.ts turns that list into the English
 * URL tree, and it has to be a small file of its own because the routing
 * config is bundled into the proxy and the browser — pages.json and
 * galleries.json are far too big to ship there.
 *
 * Run with `npm run translations` (also runs before dev and build).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN = join(HERE, "..", "content", "generated");
const read = (f) => JSON.parse(readFileSync(join(GEN, f), "utf8"));

const paths = new Set();
for (const p of Object.values(read("pages.json"))) paths.add(p.path);
for (const g of Object.values(read("galleries.json"))) paths.add(`/fotos/${g.slug}`);
for (const leg of read("journey.json").legs) {
  paths.add(`/berichte/${leg.slug}`);
  paths.add(`/route/${leg.slug}`);
  for (const c of leg.countries) {
    if (c.report) paths.add(`/berichte/${c.slug}`);
    if (c.route) paths.add(`/route/${c.slug}`);
  }
}
// Thumbnails for the overview pages, not a page of their own.
paths.delete("/fotos/galeriebilder");

const list = [...paths].sort();
writeFileSync(join(GEN, "paths.json"), JSON.stringify(list, null, 1) + "\n");
console.log(`paths: ${list.length} pages`);
