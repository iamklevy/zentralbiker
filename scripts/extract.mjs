/**
 * Migration extractor: turns the mirrored static site into structured content.
 *
 * The old pages are Dreamweaver-era documents — the whole layout is nested
 * tables, spacer GIFs, inline width/height attributes and <font> tags, and the
 * nav is duplicated into the body of every single file. None of that should
 * survive into the new build, so this reduces each page to (a) a title, (b) a
 * clean semantic HTML body, and (c) the list of images it referenced.
 *
 * Run with `npm run migrate -- <path-to-mirror>`. Output: content/generated/pages.json
 */
import { parse } from "node-html-parser";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIRROR = process.argv[2];
if (!MIRROR || !existsSync(MIRROR)) {
  console.error("usage: node scripts/extract.mjs <path-to-mirror>");
  process.exit(1);
}
const OUT = join(HERE, "..", "content", "generated");
mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(readFileSync(join(MIRROR, "_manifest.json"), "utf8"));

/* ---------------------------------------------------------------- routing */

/**
 * Country slug from a numbered filename: "301kalifornien" -> "kalifornien".
 *
 * The leg letter is only stripped when an underscore follows it, as in
 * "300a_amerika". Without that guard, `[a-c]?` also eats the first letter of
 * every country that happens to start with a, b or c — "322china" became
 * "hina", "306costa_rica" became "osta_rica" — and the page then fails its
 * content lookup and renders the empty-state instead of the report.
 */
const countrySlug = (base) => base.replace(/^\d+(?:[a-c]_)?/, "").replace(/_/g, "-");

const LEG = { a: "amerika", b: "asien", c: "ozeanien" };

/** Old mirror path -> new site path. Also the link-rewriting table. */
export function newPath(old) {
  const p = old.replace(/^\/+/, "").replace(/\.html?$/i, "");
  if (p === "index") return "/";
  const [dir, file] = p.includes("/") ? p.split("/") : [null, p];

  if (!dir) return `/${file}`; // ausruestung, berichte, fotos, route, info, varia
  if (dir === "1home") return `/${file.replace(/_/g, "-")}`; // ueber_uns -> /ueber-uns
  if (dir === "2ausruestung") return `/ausruestung/${file}`;
  if (dir === "6info") return `/info/${file}`;
  if (dir === "7varia") return `/varia/${file.replace(/_/g, "-")}`;

  // Numbered legs: 300a_amerika / 500b_asien are leg indexes, everything
  // else is a country page that joins report <-> route <-> gallery by number.
  const legMatch = file.match(/^[35]00([abc])_/);
  if (dir === "3berichte") {
    return legMatch ? `/berichte/${LEG[legMatch[1]]}` : `/berichte/${countrySlug(file)}`;
  }
  if (dir === "5route") {
    return legMatch ? `/route/${LEG[legMatch[1]]}` : `/route/${countrySlug(file)}`;
  }
  if (dir === "4fotos") return `/fotos/${countrySlug(file.replace(/^\d+[a-z]*_/, ""))}`;
  return `/${p}`;
}

/* ------------------------------------------------------------- html clean */

const DROP_ATTRS = [
  "width", "height", "align", "valign", "border", "cellpadding", "cellspacing",
  "bgcolor", "background", "hspace", "vspace", "nowrap", "class", "id",
];

/** Inline styles that are purely legacy layout scaffolding. */
const LAYOUT_STYLE =
  /(float|width|height|padding|margin|border|background|font-family|font-size|text-indent)\s*:/i;

const DROP_TAGS = ["script", "noscript", "style", "meta", "link"];
const UNWRAP_TAGS = ["font", "center", "basefont", "tt"];

function cleanNode(node, ctx) {
  for (const el of node.querySelectorAll("*")) {
    const tag = el.rawTagName ? el.rawTagName.toLowerCase() : "";

    // The nav is baked into every page body — the new site has a real header.
    if (tag === "ul" && /naviMain/i.test(el.getAttribute("id") || "")) {
      el.remove();
      continue;
    }
    if (DROP_TAGS.includes(tag)) {
      el.remove();
      continue;
    }
    if (UNWRAP_TAGS.includes(tag)) {
      el.replaceWith(...el.childNodes);
      continue;
    }

    if (tag === "img") {
      const src = el.getAttribute("src");
      const resolved = src ? resolveAsset(src, ctx.dir) : null;
      // Spacer GIFs held the old layout together and mean nothing now.
      if (!resolved || /spacer|blank|pixel|shim|clear\.gif/i.test(resolved)) {
        el.remove();
        continue;
      }
      ctx.images.push(resolved);
      const alt = el.getAttribute("alt") || el.getAttribute("title") || "";
      for (const a of DROP_ATTRS) el.removeAttribute(a);
      el.removeAttribute("style");
      el.setAttribute("src", "/media/" + resolved);
      el.setAttribute("alt", alt);
      continue;
    }

    if (tag === "a") {
      const href = el.getAttribute("href");
      if (href && !/^(https?:|mailto:|tel:|#)/i.test(href)) {
        if (/\.html?$/i.test(href)) {
          el.setAttribute("href", newPath(flatten(href, ctx.dir)));
        } else {
          const r = resolveAsset(href, ctx.dir);
          if (r) el.setAttribute("href", "/media/" + r);
        }
      } else if (href && /^https?:/i.test(href)) {
        el.setAttribute("rel", "noopener noreferrer");
        el.setAttribute("target", "_blank");
      }
      el.removeAttribute("class");
      el.removeAttribute("id");
      const st = el.getAttribute("style");
      if (st && LAYOUT_STYLE.test(st)) el.removeAttribute("style");
      continue;
    }

    for (const a of DROP_ATTRS) el.removeAttribute(a);
    const style = el.getAttribute("style");
    if (style && LAYOUT_STYLE.test(style)) el.removeAttribute("style");
  }
}

/**
 * Resolve a path against the page's directory, into a mirror path.
 *
 * A leading slash means root-relative, so the page's own directory must be
 * dropped: a few pages write `src="/images/web/bus.png"` while their siblings
 * write `"../images/web/bus.png"` for the same file. Treating the first form
 * as directory-relative invents `5route/images/web/bus.png`, which has never
 * existed on the server.
 */
function flatten(rel, dir) {
  const rooted = rel.startsWith("/");
  const base = rooted || !dir ? [] : dir.split("/");
  const parts = base.concat(rel.split("/"));
  const out = [];
  for (const seg of parts) {
    if (!seg || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

function resolveAsset(rel, dir) {
  if (/^(https?:|data:)/i.test(rel)) return null;
  let decoded = rel;
  try {
    decoded = decodeURIComponent(rel);
  } catch {
    /* malformed escape in a legacy filename — keep the raw form */
  }
  return flatten(decoded.split("?")[0], dir);
}

/**
 * Layout tables get unwrapped; real data tables are kept.
 * Heuristic: a table is "data" if it has a header row, or more than one row
 * with a consistent 2+ column shape. Everything else was holding the page
 * together with invisible cells and becomes plain block content.
 */
function unwrapLayoutTables(root) {
  for (const table of [...root.querySelectorAll("table")].reverse()) {
    const rows = table.querySelectorAll("tr");
    const hasHeader = table.querySelectorAll("th").length > 0;
    const cols = rows.map((r) => r.querySelectorAll("td,th").length);
    const consistent = cols.length > 1 && cols.every((c) => c === cols[0]) && cols[0] >= 2;
    if (hasHeader || consistent) continue; // keep as a real table

    /*
     * Rewrite the markup rather than rebuilding from queried cells.
     *
     * Several of these tables are malformed badly enough that the parser
     * hoists the <tr>s out of the <table>, so querySelectorAll("td,th")
     * sees only a handful of the real cells. Reconstructing from that list
     * silently dropped ~90% of some pages. Operating on innerHTML instead
     * cannot lose anything: every child comes along, structural tags just
     * become plain blocks.
     */
    const before = table.text.replace(/\s+/g, " ").trim().length;
    const inner = table.innerHTML
      .replace(/<\/?(?:tbody|thead|tfoot|colgroup|col|caption)[^>]*>/gi, "")
      .replace(/<\/?tr[^>]*>/gi, "")
      .replace(/<t[dh][^>]*>/gi, "<div>")
      .replace(/<\/t[dh]>/gi, "</div>");
    const replacement = parse(`<div>${inner}</div>`);

    // Guard: a layout unwrap must never cost text. If it somehow would,
    // leave the table alone — an ugly table beats a missing paragraph.
    const after = replacement.text.replace(/\s+/g, " ").trim().length;
    if (after < before) continue;
    table.replaceWith(replacement);
  }
}

/** Drop the &nbsp;-only spacer paragraphs the old editor left everywhere. */
function stripEmpties(root) {
  for (const el of [...root.querySelectorAll("p,div,span,td,tr")].reverse()) {
    const txt = el.text.replace(/ |\s/g, "");
    if (!txt && el.querySelectorAll("img,iframe,br,a,table").length === 0) el.remove();
  }
}

/**
 * Pull the content region out of the raw file by string slicing rather than
 * by querying a parsed tree.
 *
 * These pages have unbalanced tags — an unclosed <table> in the sidebar, a
 * stray </div> — and a forgiving DOM parser reacts by silently re-parenting
 * or dropping whole subtrees. On ~20% of the site that made a
 * querySelector("#navi-sdf") come back null even though the div is plainly
 * there in the source. Slicing between the two markers that every page does
 * have, and parsing only that fragment, sidesteps the damage: a broken tag
 * inside the fragment can then only affect that one page's body.
 */
function sliceContent(raw) {
  const startId = raw.indexOf('id="navi-sdf"');
  if (startId < 0) return null;
  const open = raw.indexOf(">", startId);
  if (open < 0) return null;

  // The content region ends at the clearing <br> if present, else at #footer.
  let end = raw.indexOf('class="clearfloat"', open);
  if (end < 0) end = raw.length;
  const footer = raw.indexOf('id="footer"', open);
  if (footer >= 0 && footer < end) end = footer;

  // Walk back off the partial "<div ..." / "<br ..." that owns the end marker.
  const lastOpen = raw.lastIndexOf("<", end);
  let body = raw.slice(open + 1, lastOpen > open ? lastOpen : end);

  // Trim the trailing closers that belonged to the wrapper we just cut.
  return body.replace(/(?:\s*<\/div>)+\s*$/i, "").trim();
}

/* ------------------------------------------------------------------ main */

const out = {};
let skipped = 0;

for (const oldPath of Object.keys(manifest.pages)) {
  const file = join(MIRROR, oldPath);
  if (!existsSync(file)) {
    skipped++;
    continue;
  }
  const fragment = sliceContent(readFileSync(file, "utf8"));
  if (fragment === null) {
    skipped++;
    continue;
  }
  const body = parse(fragment);

  const dir = oldPath.includes("/") ? oldPath.split("/").slice(0, -1).join("/") : "";
  const ctx = { dir, images: [] };

  cleanNode(body, ctx);
  unwrapLayoutTables(body);
  stripEmpties(body);

  const text = body.text.replace(/\s+/g, " ").trim();
  out[oldPath] = {
    oldPath,
    path: newPath(oldPath),
    title: (manifest.pages[oldPath].title || "").replace(/\s+/g, " ").trim(),
    html: body.innerHTML.replace(/\n{3,}/g, "\n\n").trim(),
    text,
    words: text ? text.split(" ").length : 0,
    images: [...new Set(ctx.images)],
  };
}

writeFileSync(join(OUT, "pages.json"), JSON.stringify(out, null, 1));

const vals = Object.values(out);
const totalWords = vals.reduce((n, p) => n + p.words, 0);
console.log(`extracted ${vals.length} pages (skipped ${skipped}), ${totalWords.toLocaleString()} words`);
console.log(`thin pages (<40 words): ${vals.filter((p) => p.words < 40).length}`);
console.log(`images referenced: ${new Set(vals.flatMap((p) => p.images)).size}`);
