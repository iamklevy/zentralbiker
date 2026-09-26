/**
 * Second migration pass: turn the flat page dump into the site's content model.
 *
 * Produces two files:
 *   content/generated/journey.json  — legs -> countries, joining each country's
 *                                     report / route / gallery by its number.
 *   content/generated/galleries.json — every gallery's full+thumb image pairs.
 *
 * The old site encoded all of this in filename numbering: 3NN is a country's
 * written report, 5NN the same country's route page, 4NN its photo gallery.
 * That numbering is the only join key there is, so it is what we key on here.
 *
 * Run after scripts/extract.mjs, via `npm run migrate`.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN = join(HERE, "..", "content", "generated");
const MIRROR = process.argv[2];
if (!MIRROR || !existsSync(MIRROR)) {
  console.error("usage: node scripts/build-content.mjs <path-to-mirror>");
  process.exit(1);
}

const pages = JSON.parse(readFileSync(join(GEN, "pages.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(MIRROR, "_manifest.json"), "utf8"));

/* ------------------------------------------------------------------ legs */

/** Country-number ranges per leg, taken from what each leg index links to. */
const LEGS = [
  { slug: "amerika", from: 1, to: 15, order: 1 },
  { slug: "asien", from: 16, to: 30, order: 2 },
  { slug: "ozeanien", from: 31, to: 34, order: 3 },
];

/** Display names — the filenames are ASCII-folded, these are not. */
const NAMES = {
  kalifornien: "Kalifornien", mexiko: "Mexiko", guatemala: "Guatemala",
  honduras: "Honduras", nicaragua: "Nicaragua", "costa-rica": "Costa Rica",
  panama: "Panama", florida: "Florida", ecuador: "Ecuador", peru: "Peru",
  bolivien: "Bolivien", paraguay: "Paraguay", argentinien: "Argentinien",
  uruguay: "Uruguay", "new-york": "New York", tuerkei: "Türkei", iran: "Iran",
  turkmenistan: "Turkmenistan", usbekistan: "Usbekistan",
  tadschikistan: "Tadschikistan", kirgistan: "Kirgistan", china: "China",
  laos: "Laos", kambodscha: "Kambodscha", thailand: "Thailand",
  malaysia: "Malaysia", singapur: "Singapur", borneo: "Borneo",
  bolivia: "Bolivien", chile: "Chile", "new-zealand": "Neuseeland",
  rumaenien: "Rumänien", aegypten: "Ägypten", mexico: "Mexico",
  nordamerika: "Nordamerika", suedamerika: "Südamerika",
};

const nice = (slug) => NAMES[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ------------------------------------------------------- country assembly */

/** "3berichte/310peru.html" -> { sec:"3", num:10, slug:"peru" } */
function parseNumbered(oldPath) {
  const m = oldPath.match(/^([345])[a-z]+\/(\d)(\d\d)([a-z_]*)\.html$/);
  if (!m) return null;
  const [, sec, , two, rest] = m;
  if (/^0[a-c]?_/.test(rest) || rest === "") return null; // leg index page
  return { sec, num: parseInt(two, 10), slug: rest.replace(/^_/, "").replace(/_/g, "-") };
}

const countries = new Map();
for (const oldPath of Object.keys(pages)) {
  const p = parseNumbered(oldPath);
  if (!p) continue;
  const key = p.num;
  if (!countries.has(key)) countries.set(key, { num: key, slug: p.slug });
  const c = countries.get(key);
  // The report section owns the canonical slug; route/gallery filenames
  // sometimes differ in spelling (531bolivia vs 331bolivien).
  if (p.sec === "3") c.slug = p.slug;
  c[{ 3: "report", 5: "route", 4: "gallery" }[p.sec]] = oldPath;
}

/* --------------------------------------------------------------- galleries */

/**
 * Pair each full-size photo with its thumbnail.
 *
 * The old galleries keep the two in sibling directories with matching
 * filenames — `410photos_peru/x.jpg` next to `410thumbnails_peru/x.jpg`, or
 * `images_highlights_amerika/x.jpg` next to `.../thumbs/x.jpg`. Anything
 * without a partner still ships; it just uses the full image for both.
 */
const byDir = new Map();
for (const a of manifest.assets) {
  if (!/\.(jpe?g|png|gif)$/i.test(a)) continue;
  const dir = a.slice(0, a.lastIndexOf("/"));
  const file = a.slice(a.lastIndexOf("/") + 1);
  if (!byDir.has(dir)) byDir.set(dir, new Map());
  byDir.get(dir).set(file.toLowerCase(), a);
}

const thumbDirFor = (dir) =>
  dir.includes("photos_") ? dir.replace("photos_", "thumbnails_") : `${dir}/thumbs`;

/** Lowercased filename with its extension removed. */
const stem = (name) => name.replace(/\.[a-z0-9]+$/i, "").toLowerCase();

/** Trailing markers the old galleries used to tag a thumbnail. */
const THUMB_SUFFIX = /[-_](?:tn|thumb|thumbnail|small|klein|mini)$/i;

/**
 * Match a full photo to its thumbnail.
 *
 * The two files rarely share a name, and the galleries use two different
 * conventions at once:
 *   prefix  `RIMG0180.jpg`      -> `thumb_kalifornienRIMG0180.JPG`
 *   suffix  `002 Altiplano.JPG` -> `002 Altiplano-tn.JPG`
 * Extension case is inconsistent on top of that. Matching on exact filenames
 * misses roughly a quarter of the library, and every miss means the grid
 * serves a 134 KB original where a 17 KB thumbnail exists. So each thumb is
 * indexed under both its plain stem and its suffix-stripped stem, and the
 * prefixed form is caught by an endsWith scan. Exact hits are tried first so
 * the common case stays O(1).
 */
function pairThumbs(files, thumbs) {
  const exact = new Map();
  const keyed = new Map();
  const stems = [];

  for (const [lower, path] of thumbs) {
    exact.set(lower, path);
    const s = stem(lower);
    const bare = s.replace(THUMB_SUFFIX, "");
    if (!keyed.has(s)) keyed.set(s, path);
    if (!keyed.has(bare)) keyed.set(bare, path);
    stems.push([bare, path]);
  }
  // Longest stems first, so a thumb for "img10" never claims "img1".
  stems.sort((a, b) => b[0].length - a[0].length);

  return (lower, full) => {
    const hit = exact.get(lower);
    if (hit) return hit;
    const target = stem(lower);
    const direct = keyed.get(target);
    if (direct) return direct;
    const found = stems.find(([s]) => s.endsWith(target));
    return found ? found[1] : full;
  };
}

const galleries = {};
for (const [dir, files] of byDir) {
  if (!dir.startsWith("4fotos/")) continue;
  if (dir.includes("thumbnails_") || dir.endsWith("/thumbs")) continue;

  const thumbs = byDir.get(thumbDirFor(dir)) || new Map();
  const findThumb = pairThumbs(files, thumbs);
  const items = [...files.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "de", { numeric: true }))
    .map(([lower, full]) => ({ src: full, thumb: findThumb(lower, full) }));
  if (!items.length) continue;

  const base = dir.slice("4fotos/".length);
  // A numbered photo folder belongs to the gallery page with the same number,
  // and must live at that page's URL — the folder names are spelled
  // differently (406photos_costarica vs 406costa_rica.html, 419photos_uzbekistan
  // vs 419usbekistan.html), and every menu and in-text link uses the page's.
  const num = base.match(/^(\d{3})/)?.[1];
  const pageForNum = num && Object.values(pages).find((p) => p.oldPath.startsWith(`4fotos/${num}`));
  const slug = pageForNum
    ? pageForNum.path.slice("/fotos/".length)
    : base
        .replace(/^\d+/, "")
        .replace(/^(photos|thumbnails|images)_?/, "")
        .replace(/^highlights_/, "highlights-")
        .replace(/_/g, "-");
  galleries[dir] = { dir, slug, name: nice(slug.replace(/^highlights-/, "")), count: items.length, items };
}

/* ------------------------------------------------------------------ write */

const legs = LEGS.map((leg) => ({
  ...leg,
  name: nice(leg.slug),
  countries: [...countries.values()]
    .filter((c) => c.num >= leg.from && c.num <= leg.to)
    .sort((a, b) => a.num - b.num)
    .map((c) => ({
      ...c,
      name: nice(c.slug),
      path: `/berichte/${c.slug}`,
      galleryDir:
        Object.keys(galleries).find((d) => d.startsWith(`4fotos/${String(c.num).padStart(2, "0")}`)) ||
        Object.keys(galleries).find((d) => new RegExp(`^4fotos/\\d${String(c.num).padStart(2, "0")}`).test(d)) ||
        null,
    })),
}));

writeFileSync(join(GEN, "journey.json"), JSON.stringify({ legs }, null, 1));
writeFileSync(join(GEN, "galleries.json"), JSON.stringify(galleries, null, 1));

const totalCountries = legs.reduce((n, l) => n + l.countries.length, 0);
const totalPhotos = Object.values(galleries).reduce((n, g) => n + g.count, 0);
const withThumb = Object.values(galleries).reduce(
  (n, g) => n + g.items.filter((i) => i.thumb !== i.src).length, 0);
console.log(`journey: ${legs.length} legs, ${totalCountries} countries`);
legs.forEach((l) => console.log(`   ${l.name.padEnd(10)} ${l.countries.length} countries`));
console.log(`galleries: ${Object.keys(galleries).length}, ${totalPhotos} photos (${withThumb} with a real thumbnail)`);
const noGallery = legs.flatMap((l) => l.countries).filter((c) => !c.galleryDir);
if (noGallery.length) console.log(`countries without a gallery: ${noGallery.map((c) => c.slug).join(", ")}`);
