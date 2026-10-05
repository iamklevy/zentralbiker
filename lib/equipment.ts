import { parse, NodeType, type HTMLElement, type Node } from "node-html-parser";

/**
 * Reads the old equipment pages (Ausrüstung) into data-sheet entries, so they
 * can be shown as spec cards instead of the old fixed-width layout. The pages
 * come in a handful of shapes, all handled here in document order:
 *
 * - products: a bold name and description, then a box of picture | labels |
 *   values, the labels and values two line-broken lists (Schlafen, Kochen);
 *   or a picture beside the name and a list of features (Technik)
 * - a two-column table of label | value (the bike's components, documents)
 * - a kit: one photo, then its contents one per line, a weight, and what is
 *   "not in the photo" (Necessaire, Diverses, Apotheke), or the same as a
 *   table with the photo in a tall first cell (Werkzeug, Ersatzteile)
 * - the clothing list: a table of item | her count | his count, in groups
 *
 * The English translations keep the same markup, so both read the same way.
 */

export interface GearImage {
  /** Path relative to the media root. */
  src: string;
  width?: number;
  height?: number;
  alt: string;
}

export interface GearSpec {
  label: string;
  value: string;
}

export interface GearItem {
  /** Part number on the card, e.g. "SCH-01". */
  code: string;
  name?: string;
  text: string[];
  images: GearImage[];
  specs: GearSpec[];
  /** Feature lines or kit contents without a label. */
  features: string[];
  weight?: string;
  /** "Not in the photo", for kits. */
  extras?: { title?: string; lines: string[] };
}

export interface GearTable {
  columns: string[];
  groups: { title?: string; rows: string[][] }[];
}

export type GearBlock =
  | { kind: "text"; lines: string[] }
  | { kind: "item"; item: GearItem }
  | { kind: "table"; table: GearTable }
  | { kind: "note"; text: string };

/** Part-number prefix per category. */
export const GEAR_CODES: Record<string, string> = {
  trekkingrad: "TRK",
  schlafen: "SCH",
  kochen: "KOC",
  kleider: "KLE",
  apotheke: "APO",
  necessaire: "NEC",
  administration: "ADM",
  technik: "TEC",
  werkzeug: "WKZ",
  ersatzteile: "ERS",
  diverses: "DIV",
};

/** Kits whose contents come in label/value pairs (Durchfall → Loperamid). */
const PAIRED_KITS = new Set(["apotheke"]);

const BLOCK = new Set(["P", "DIV", "TABLE", "TR", "TD", "TH", "UL", "OL", "LI", "H1", "H2", "H3", "H4"]);
const WEIGHT_LABEL = /^(gewicht|weight)$/i;
const WEIGHT_LINE = /^(gewicht|weight)\b[\s:]*(.+)$/i;
const NOT_IN_PHOTO = /^(nicht auf foto|not in (the )?photo)/i;

const isEl = (n: Node): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;
const kids = (el: HTMLElement) => el.childNodes.filter((n) => isEl(n) || n.text.trim() !== "");
const elKids = (el: HTMLElement) => el.childNodes.filter(isEl);
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** The female/male signs the old pages drew as little pictures. */
function sign(img: HTMLElement): string {
  const src = img.getAttribute("src") ?? "";
  if (/venus/i.test(src)) return "♀";
  if (/mars/i.test(src)) return "♂";
  return "";
}

/** An element's text, one entry per line (<br> or block boundary). */
function lines(node: Node, skip?: (el: HTMLElement) => boolean): string[] {
  const out: string[] = [];
  let cur = "";
  const flush = () => {
    const t = clean(cur);
    if (t) out.push(t);
    cur = "";
  };
  const walk = (n: Node) => {
    if (!isEl(n)) {
      cur += n.text;
      return;
    }
    if (skip?.(n)) return;
    if (n.tagName === "BR") return flush();
    if (n.tagName === "IMG") {
      cur += sign(n);
      return;
    }
    const block = BLOCK.has(n.tagName);
    if (block) flush();
    n.childNodes.forEach(walk);
    if (block) flush();
  };
  walk(node);
  flush();
  return out;
}

/** The photos in an element, without the sign pictures and the "to top" arrow. */
function images(el: HTMLElement): GearImage[] {
  return el
    .querySelectorAll("img")
    .filter((img) => !sign(img) && !/top\.gif$/i.test(img.getAttribute("src") ?? ""))
    .map((img) => ({
      src: (img.getAttribute("src") ?? "").replace(/^\/media\//, ""),
      width: Number(img.getAttribute("width")) || undefined,
      height: Number(img.getAttribute("height")) || undefined,
      alt: img.getAttribute("alt") ?? "",
    }));
}

/** The product name: a bold span opening its paragraph. */
function titleOf(p: HTMLElement): HTMLElement | null {
  for (const n of p.childNodes) {
    if (!isEl(n)) {
      if (n.text.trim()) return null;
      continue;
    }
    if (n.tagName === "BR") continue;
    return n.tagName === "SPAN" && n.classList.contains("fett") && clean(n.text) ? n : null;
  }
  return null;
}

/** Labels and values as the old pages paired them: two lists, line by line. */
function pairSpecs(labels: string[], values: string[]): GearSpec[] {
  // A value that ran over two lines (a sleeping bag's comfort range) leaves
  // more values than labels: join the extra lines into the first value.
  const extra = Math.max(0, values.length - labels.length);
  const vals = extra ? [values.slice(0, extra + 1).join(" "), ...values.slice(extra + 1)] : values;
  return labels.map((label, i) => ({ label: label.replace(/:$/, ""), value: vals[i] ?? "" }));
}

/** Moves a weight entry out of the specs (or features) into the card's tag. */
function takeWeight(item: GearItem) {
  const s = item.specs.findIndex((x) => WEIGHT_LABEL.test(x.label));
  if (s >= 0) {
    item.weight = item.specs[s].value;
    item.specs.splice(s, 1);
    return;
  }
  const f = item.features.findIndex((x) => WEIGHT_LINE.test(x));
  if (f >= 0) {
    item.weight = item.features[f].match(WEIGHT_LINE)![2];
    item.features.splice(f, 1);
  }
}

/** Picture | labels | values: the specs box under a product. */
function isSpecBox(el: HTMLElement): boolean {
  const k = elKids(el);
  return (
    el.tagName === "DIV" &&
    k.length === 3 &&
    images(k[0]).length > 0 &&
    (k[1].classList.contains("fett") || k[1].querySelector(".fett") !== null)
  );
}

export function parseGearPage(html: string, slug: string): GearBlock[] {
  const root = parse(html);
  root.querySelectorAll('a[href="#top"]').forEach((a) => a.remove());

  const blocks: GearBlock[] = [];
  let item: GearItem | null = null;
  let pendingImages: GearImage[] = [];
  let loose: string[] = [];

  const newItem = (name?: string): GearItem => {
    item = { code: "", name, text: [], images: pendingImages, specs: [], features: [] };
    pendingImages = [];
    blocks.push({ kind: "item", item });
    return item;
  };
  const flushLoose = () => {
    if (loose.length) blocks.push({ kind: "text", lines: loose });
    loose = [];
  };
  const specBox = (box: HTMLElement) => {
    const [pic, labels, values] = elKids(box);
    const target = item ?? newItem();
    target.images.push(...images(pic));
    target.specs.push(...pairSpecs(lines(labels), lines(values)));
  };

  const table = (t: HTMLElement) => {
    const rows = t.querySelectorAll("tr");
    const th = t.querySelector("th");
    const head = rows[0] ? elKids(rows[0]) : [];

    // The clothing list: item | her | his, in groups.
    if (head.length === 3 && head.some((c) => c.querySelector("img") && sign(c.querySelector("img")!))) {
      flushLoose();
      const columns = head.map((c) => clean(lines(c).join(" ")));
      const groups: GearTable["groups"] = [];
      for (const tr of rows.slice(1)) {
        const cells = elKids(tr).map((c) => clean(lines(c).join(" ")));
        if (cells.length === 1) groups.push({ title: cells[0], rows: [] });
        else {
          if (!groups.length) groups.push({ rows: [] });
          groups[groups.length - 1].rows.push([cells[0], cells[1] ?? "", cells[2] ?? ""]);
        }
      }
      blocks.push({ kind: "table", table: { columns, groups } });
      return;
    }

    // A kit as a table: the photo in a tall first cell, contents beside it.
    // Otherwise label | value rows, named by a loose "…:" line before it.
    flushLooseExceptTitle();
    const it = newItem(nameFromLoose());
    if (th) {
      it.images.push(...images(th));
      it.features.push(...lines(th));
    }
    for (const tr of rows) {
      const cells = elKids(tr).filter((c) => c.tagName === "TD");
      if (cells.length >= 2) it.specs.push({ label: clean(lines(cells[0]).join(" ")), value: clean(lines(cells[1]).join(" ")) });
      else if (cells.length === 1) it.features.push(...lines(cells[0]));
    }
    takeWeight(it);
    item = null;
  };

  // The bike's component table is introduced by a loose line ending in ":".
  let looseTitle: string | undefined;
  const flushLooseExceptTitle = () => {
    if (loose.length && loose[loose.length - 1].endsWith(":")) looseTitle = loose.pop()!.replace(/:$/, "");
    flushLoose();
  };
  const nameFromLoose = () => {
    const t = looseTitle;
    looseTitle = undefined;
    return t;
  };

  /** A kit: one photo, then its contents one per line. */
  const kit = (el: HTMLElement) => {
    flushLoose();
    const [pic, ...rest] = elKids(el);
    const it = newItem();
    it.images.push(...images(pic));
    let extras = false;
    const contents: string[] = [];
    for (const d of rest) {
      const text = clean(lines(d).join(" "));
      if (!text) continue;
      if (NOT_IN_PHOTO.test(text)) {
        extras = true;
        it.extras = { title: text.replace(/:$/, ""), lines: [] };
      } else if (extras) it.extras!.lines.push(text);
      else contents.push(text);
    }
    if (PAIRED_KITS.has(slug)) {
      for (let i = 0; i + 1 < contents.length; i += 2) it.specs.push({ label: contents[i], value: contents[i + 1] });
    } else it.features.push(...contents);
    takeWeight(it);
    item = null;
  };

  const visit = (n: Node) => {
    if (!isEl(n)) {
      const t = clean(n.text);
      if (t) loose.push(t);
      return;
    }
    const tag = n.tagName;
    if (tag === "TABLE") return table(n);
    if (tag === "BR") return;

    if (tag === "P") {
      // a highlighted warning (Administration), even when set in bold
      const hi = n.querySelector(".hervorheben");
      if (hi) {
        flushLoose();
        blocks.push({ kind: "note", text: clean(n.text) });
        return;
      }
      const title = titleOf(n);
      if (title) {
        flushLoose();
        const it = newItem(clean(lines(title).join(" ")));
        it.text.push(...lines(n, (el) => el === title || el.tagName === "DIV"));
        // a specs box the old markup left inside the paragraph
        n.querySelectorAll("div").filter(isSpecBox).forEach(specBox);
        return;
      }
      n.querySelectorAll("div").filter(isSpecBox).forEach(specBox);
      loose.push(...lines(n, (el) => el.tagName === "DIV"));
      return;
    }

    if (tag === "DIV") {
      if (isSpecBox(n)) return specBox(n);
      const hasTitle = n.querySelectorAll("p").some((p) => titleOf(p));
      if (hasTitle) {
        // rows of picture + named feature list (Technik): read them in order
        n.childNodes.forEach(visit);
        return;
      }
      const k = elKids(n);
      const pics = images(n);
      const text = lines(n);
      if (pics.length && !text.length) {
        pendingImages.push(...pics);
        return;
      }
      if (k.length > 2 && images(k[0]).length && k.slice(1).every((d) => !images(d).length)) return kit(n);
      if (text.length) {
        // contents that did not fit the kit's photo list (Apotheke's bandages)
        const last = blocks[blocks.length - 1];
        if (last?.kind === "item" && !last.item.name && !last.item.extras) {
          last.item.extras = { lines: text };
          return;
        }
        loose.push(...text);
      }
      return;
    }

    if (BLOCK.has(tag)) n.childNodes.forEach(visit);
    else {
      const t = clean(lines(n).join(" "));
      if (t) loose.push(t);
    }
  };

  kids(root).forEach(visit);
  flushLoose();
  if (pendingImages.length) {
    // a picture with nothing after it: give it to the first card without one
    const first = blocks.find((b) => b.kind === "item" && !b.item.images.length);
    if (first?.kind === "item") first.item.images.push(...pendingImages);
  }

  let n = 0;
  const prefix = GEAR_CODES[slug] ?? slug.slice(0, 3).toUpperCase();
  for (const b of blocks) {
    if (b.kind !== "item") continue;
    // a name over a list of short lines and no specs box (Technik): those
    // lines are features, not a description
    if (!b.item.specs.length && !b.item.features.length && b.item.text.length > 1) {
      b.item.features = b.item.text;
      b.item.text = [];
    }
    if (!b.item.weight) takeWeight(b.item);
    b.item.code = `${prefix}-${String(++n).padStart(2, "0")}`;
  }
  return blocks;
}

/** The overview page: its intro text and the outfitter it thanks. */
export function parseGearIndex(html: string): {
  intro: string[];
  partner?: { title: string; href: string; logo?: GearImage };
  image?: GearImage;
} {
  const root = parse(html);
  const link = root.querySelector('a[href^="http"]');
  const partnerBox = link?.closest("div");
  const title = partnerBox ? clean(partnerBox.querySelector("strong")?.text ?? "") : "";
  const intro = lines(root, (el) => el === partnerBox || (el.tagName === "DIV" && images(el).length > 0 && !lines(el).length));
  return {
    intro,
    partner: link ? { title, href: link.getAttribute("href")!, logo: images(link)[0] } : undefined,
    image: images(root).find((i) => !link || !images(link).some((l) => l.src === i.src)),
  };
}
