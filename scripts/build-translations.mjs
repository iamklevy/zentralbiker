/**
 * Assembles the English pages into content/translations/en.json, and checks
 * each one against its German original.
 *
 * Each translated page is its own file, mirroring the site's URL:
 *   content/translations/en/index.html          -> /
 *   content/translations/en/berichte/peru.html  -> /berichte/peru
 * The first line may carry the page title: <!-- title: Peru -->
 *
 * One file per page keeps corrections easy: a teacher's edits to the Peru
 * report go into exactly one file, and nothing else can be disturbed.
 *
 * The check: a translation must keep every picture and every link of the
 * original — words change, the page around them must not. Anything missing
 * is reported, and the script exits non-zero so a build cannot ship it.
 *
 * Run with `npm run translations` (also runs before dev and build).
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "content");
const SRC = join(ROOT, "translations", "en");

const pages = JSON.parse(readFileSync(join(ROOT, "generated", "pages.json"), "utf8"));
const german = new Map();
for (const p of Object.values(pages)) {
  const e = german.get(p.path);
  if (!e || p.words > e.words) german.set(p.path, p);
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    if (statSync(f).isDirectory()) yield* walk(f);
    else if (name.endsWith(".html")) yield f;
  }
}

const refs = (html) =>
  [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]).sort();

const out = {};
const problems = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, "/").replace(/\.html$/, "");
  const path = rel === "index" ? "/" : `/${rel}`;
  const raw = readFileSync(file, "utf8");
  const title = raw.match(/^<!--\s*title:\s*(.*?)\s*-->/)?.[1];
  const html = raw.replace(/^<!--\s*title:.*?-->\s*/, "").trim();

  const de = german.get(path);
  if (!de) {
    problems.push(`${path}: no German page at this path`);
    continue;
  }
  const a = refs(de.html);
  const b = refs(html);
  const missing = a.filter((x) => !b.includes(x));
  const extra = b.filter((x) => !a.includes(x));
  if (missing.length || extra.length) {
    problems.push(
      `${path}: ${missing.length} picture/link(s) missing, ${extra.length} unexpected` +
        [...missing.slice(0, 3).map((x) => `\n    - ${x}`), ...extra.slice(0, 3).map((x) => `\n    + ${x}`)].join(""),
    );
  }
  out[path] = title ? { title, html } : { html };
}

writeFileSync(join(ROOT, "translations", "en.json"), JSON.stringify(out, null, 1));

const todo = [...german.values()].filter((p) => p.words > 0 && !out[p.path]);
console.log(`english: ${Object.keys(out).length} pages translated, ${todo.length} with text still to do`);
if (process.argv.includes("--todo")) for (const p of todo) console.log(`  ${p.path} (${p.words} words)`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ` + problems.join("\n  "));
  process.exit(1);
}
