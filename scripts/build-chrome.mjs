/**
 * Extracts the original site's per-page chrome: the Lucerne header banner and
 * the left sidebar menu (#naviMain_1).
 *
 * The sidebar is not derivable from the section alone — a gallery page lists
 * only its own sub-continent, the Berichte and Route pages list the countries
 * of their leg — so it is copied from each old page verbatim rather than
 * reconstructed. Output: content/generated/chrome.json, keyed by NEW path.
 *
 * Run with `node scripts/build-chrome.mjs <path-to-mirror>` (part of `npm run migrate`).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { EXCLUDED_PAGES, withoutExcluded } from "./excluded.mjs";
import { germanName } from "./german-names.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIRROR = process.argv[2];
if (!MIRROR || !existsSync(MIRROR)) {
  console.error("usage: node scripts/build-chrome.mjs <path-to-mirror>");
  process.exit(1);
}

const manifest = withoutExcluded(JSON.parse(readFileSync(join(MIRROR, "_manifest.json"), "utf8")));
const pages = JSON.parse(readFileSync(join(HERE, "..", "content", "generated", "pages.json"), "utf8"));

/** Old path -> new path, taken from the migration output so the two never disagree. */
const toNew = (old) => pages[old]?.path ?? null;

function flatten(rel, dir) {
  const parts = (dir ? dir.split("/") : []).concat(rel.split("/"));
  const out = [];
  for (const seg of parts) {
    if (!seg || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const out = {};
let missing = 0;

for (const oldPath of Object.keys(manifest.pages)) {
  const path = toNew(oldPath);
  if (!path || out[path]) continue;

  const file = join(MIRROR, oldPath);
  if (!existsSync(file)) continue;
  const raw = readFileSync(file, "utf8");
  const dir = oldPath.includes("/") ? oldPath.split("/").slice(0, -1).join("/") : "";

  const banner = raw.match(/images\/kopf\/([^"']+)/)?.[1] ?? null;

  const sidebar = [];
  const ul = raw.match(/<ul id="naviMain_1">([\s\S]*?)<\/ul>/)?.[1] ?? "";
  for (const m of ul.matchAll(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const [, href, label] = m;
    // "#" is how the old site marked the current page in its own menu.
    const old = flatten(href.split("#")[0], dir);
    if (EXCLUDED_PAGES.has(old)) continue; // not migrated, so not in the menu either
    const target = href === "#" ? path : toNew(old);
    if (!target) {
      missing++;
      continue;
    }
    sidebar.push({ label: germanName(decode(label)), href: target });
  }

  out[path] = { banner, sidebar };
}

writeFileSync(join(HERE, "..", "content", "generated", "chrome.json"), JSON.stringify(out, null, 1));
console.log(`chrome for ${Object.keys(out).length} pages, ${missing} unresolved sidebar links`);
