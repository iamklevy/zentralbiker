/**
 * Reads the old photo overview pages (Fotos, Nordamerika, Filme Asien, …)
 * into cards. Those pages lay out a row of thumbnail links followed by a
 * separate row of label links, table-style, so a thumbnail and its name only
 * line up as long as the old fixed-width layout holds. Here each thumbnail
 * is paired with its label, so they can be shown as one print.
 *
 * Pairing: a label is the text link to the same place as the thumbnail
 * (photo pages). Thumbnails without one — the films, whose names are plain
 * text — take the plain texts that follow their row, in order. Text before
 * a row of thumbnails heads it (the countries on the film pages). Text links
 * that no thumbnail claims are the page's own menu (Nordamerika · Asien …).
 */

export interface OverviewCard {
  href: string;
  /** Path relative to the media root. */
  img: string;
  width: number;
  height: number;
  label: string;
  /** A film, not a link to another page. */
  video: boolean;
}

export interface OverviewSection {
  heading: string[];
  cards: OverviewCard[];
}

export interface Overview {
  nav: { href: string; label: string }[];
  sections: OverviewSection[];
}

type Token =
  | { kind: "img"; href: string; img: string; width: number; height: number; alt: string }
  | { kind: "link"; href: string; text: string }
  | { kind: "text"; text: string };

const ENTITIES: Record<string, string> = { amp: "&", nbsp: " ", quot: '"', lt: "<", gt: ">", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", eacute: "é" };
const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&(#\d+|\w+);/g, (m, e: string) =>
      e.startsWith("#") ? String.fromCharCode(Number(e.slice(1))) : (ENTITIES[e] ?? m),
    )
    .replace(/\s+/g, " ")
    .trim();
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? "";

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  // A link (with or without a picture in it), or the text of a leaf block —
  // which may carry a stray <br> ("<div>Pilger<br></div>").
  const re = /<a\s([^>]*)>([\s\S]*?)<\/a>|<(div|td|p)[^>]*>((?:[^<]|<br\s*\/?>)+)<\/\3>/g;
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) {
      const href = attr(` ${m[1]}`, "href");
      const img = m[2].match(/<img\s[^>]*>/)?.[0];
      if (img) {
        const src = attr(img, "src");
        if (!src.startsWith("/media/")) continue;
        tokens.push({
          kind: "img",
          href,
          img: src.slice("/media/".length),
          width: Number(attr(img, "width")) || 150,
          height: Number(attr(img, "height")) || 113,
          alt: decode(attr(img, "alt")),
        });
      } else {
        const text = decode(m[2]);
        if (text) tokens.push({ kind: "link", href, text });
      }
    } else {
      const text = decode(m[4]);
      if (text) tokens.push({ kind: "text", text });
    }
  }
  return tokens;
}

export function parseOverview(html: string): Overview | null {
  const tokens = tokenize(html);
  const imgs = tokens.filter((t) => t.kind === "img");
  if (!imgs.length) return null;

  const used = new Set<Token>();
  const label = new Map<Token, string>();

  // 1. Photo pages: the text link going to the same place.
  for (const t of imgs) {
    const match = tokens.find((l) => l.kind === "link" && !used.has(l) && l.href === t.href);
    if (match && match.kind === "link") {
      label.set(t, match.text);
      used.add(match);
    }
  }

  // 2. Film pages: a row of unlabelled thumbnails takes the plain texts after it.
  const sections: OverviewSection[] = [];
  let heading: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === "text" && !used.has(t)) {
      heading.push(t.text);
      used.add(t);
      continue;
    }
    if (t.kind !== "img") continue;

    const row: Token[] = [];
    while (i < tokens.length && (tokens[i].kind === "img" || used.has(tokens[i]) || tokens[i].kind === "link")) {
      if (tokens[i].kind === "img") row.push(tokens[i]);
      i++;
    }
    const unlabelled = row.filter((r) => !label.has(r));
    for (const r of unlabelled) {
      const next = tokens.slice(i).find((n) => n.kind === "text" && !used.has(n));
      if (!next || next.kind !== "text") break;
      label.set(r, next.text);
      used.add(next);
    }
    i--; // the loop's own i++ moves past the row

    const cards = row.map((r) => {
      const c = r as Extract<Token, { kind: "img" }>;
      return {
        href: c.href,
        img: c.img,
        width: c.width,
        height: c.height,
        label: label.get(r) ?? c.alt,
        video: c.href.startsWith("/media/"),
      };
    });
    const last = sections.at(-1);
    // Rows split only by their label rows belong to the same section.
    if (last && !heading.length) last.cards.push(...cards);
    else sections.push({ heading, cards });
    heading = [];
  }

  const nav = tokens
    .filter((t): t is Extract<Token, { kind: "link" }> => t.kind === "link" && !used.has(t) && t.href !== "")
    .map((t) => ({ href: t.href, label: t.text }));

  return { nav, sections };
}
