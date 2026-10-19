import { parse, NodeType, type HTMLElement, type Node } from "node-html-parser";

/**
 * Reads the old Info pages into data, so they can be shown as cards, tables
 * and download sheets instead of the old fixed-width layout tables (see
 * components/site/info). Each page has its own shape, all read here:
 *
 * - Visa: two tables of country | entry rules (America, then Asia/Oceania),
 *   each after a paragraph about it
 * - Impfung: three bold headings, each with the countries it applies to,
 *   then a table (or a box) of disease | advice
 * - Flüge: prose, the flights booked as its first lines, the airline's
 *   statement as a bold-labelled quote
 * - Statistiken, Testberichte: pictures and links to PDFs
 * - Sponsoring, Links: a table of logos, then (Links) lists of links under
 *   bold headings
 *
 * The English translations keep the same markup, so both read the same way.
 * Text that may carry links or emphasis stays HTML; the rest is plain text.
 */

export interface InfoImage {
  /** Path relative to the media root. */
  src: string;
  width?: number;
  height?: number;
  alt: string;
}

export interface InfoLink {
  href: string;
  label: string;
  image?: InfoImage;
}

const isEl = (n: Node): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;
const elKids = (el: HTMLElement) => el.childNodes.filter(isEl);
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const text = (n: Node) => clean(n.text);
const media = (src: string) => decodeURI(src.replace(/^\/media\//, ""));

/** The old pages' "back to top" arrow, which the new layout does not need. */
function dropTopLinks(root: HTMLElement) {
  for (const a of root.querySelectorAll('a[href="#top"]')) (a.parentNode ?? a).remove();
}

function image(img: HTMLElement): InfoImage {
  const n = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
  return {
    src: media(img.getAttribute("src") ?? ""),
    width: n(img.getAttribute("width")),
    height: n(img.getAttribute("height")),
    alt: clean(img.getAttribute("alt") ?? ""),
  };
}

/**
 * Inline HTML worth keeping: links and emphasis. The old bold class becomes
 * <strong>; layout wrappers and stray pictures go.
 */
function inline(el: HTMLElement): string {
  const copy = parse(el.innerHTML);
  for (const s of copy.querySelectorAll("span.fett")) s.replaceWith(`<strong>${s.innerHTML}</strong>`);
  for (const s of copy.querySelectorAll("span, div, font")) s.replaceWith(s.innerHTML);
  for (const i of copy.querySelectorAll("img")) i.remove();
  return clean(copy.innerHTML).replace(/^(?:<br\s*\/?>\s*)+|(?:\s*<br\s*\/?>)+$/gi, "");
}

/** An element's inline HTML, one entry per <br>-separated line. */
function htmlLines(el: HTMLElement): string[] {
  return inline(el)
    .split(/<br\s*\/?>/i)
    .map((l) => clean(l))
    .filter((l) => clean(parse(l).text) !== "");
}

const plain = (html: string) => clean(parse(html).text);

/* -------------------------------------------------------------- visa */

export type VisaStatus = "free" | "visa" | "arrival";

export interface VisaCountry {
  name: string;
  /** The entry rules, inline HTML. */
  html: string;
  status?: VisaStatus;
  /** How long the passport must still be valid, in months. */
  passport?: number;
  /** The usual stay without further formalities, in days. */
  stay?: number;
}

export interface VisaGroup {
  intro: string[];
  countries: VisaCountry[];
}

const FREE = /kein visum erforderlich|ohne (touristen)?visum|no visa (is )?(required|needed)|without (a )?(tourist )?visa/i;
const NEEDS = /mit visum|with (a )?visa/i;
const ON_ARRIVAL = /visa on arrival|zur einreise ein visum|bei der einreise .*ausgestellt|visa on entry|issued on arrival/i;
/** A table's lead-in saying none of its countries needs a visa (America). */
const NONE_NEED = /keine?\s+visumpflicht|no visa is required/i;
const PASSPORT = /mindestens\s+(\d+|sechs)\s+monate|at least (?:another )?(\d+|six) months/i;
const STAY = /(?:aufenthaltsdauer betraegt gewoehnlich|bis zu|usually stay|stays? of up to|up to)\s+(\d+)\s+(?:tage|tagen|days)/i;

function visaCountry(name: string, cell: HTMLElement): VisaCountry {
  const html = inline(cell);
  const t = plain(html);
  const status: VisaStatus | undefined = FREE.test(t) ? "free" : NEEDS.test(t) ? "visa" : ON_ARRIVAL.test(t) ? "arrival" : undefined;
  const months = t.match(PASSPORT);
  const stay = t.match(STAY);
  const num = (s?: string) => (s ? (/^\d+$/.test(s) ? Number(s) : 6) : undefined);
  return {
    name,
    html,
    ...(status && { status }),
    ...(months && { passport: num(months[1] ?? months[2]) }),
    ...(stay && { stay: Number(stay[1]) }),
  };
}

/** Visa: each table of countries with the paragraphs that lead into it. */
export function parseVisa(html: string): VisaGroup[] {
  const root = parse(html);
  dropTopLinks(root);
  const groups: VisaGroup[] = [];
  let intro: string[] = [];
  for (const el of elKids(root)) {
    if (el.tagName === "TABLE") {
      const countries = el.querySelectorAll("tr").flatMap((tr) => {
        const [name, rules] = tr.querySelectorAll("td");
        return name && rules ? [visaCountry(text(name), rules)] : [];
      });
      // the rows that say nothing of a visa follow the lead-in
      if (intro.some((p) => NONE_NEED.test(plain(p))))
        for (const c of countries) c.status ??= "free";
      groups.push({ intro, countries });
      intro = [];
    } else if (el.tagName === "P") {
      const t = text(el);
      // "Einreisebestimmungen:" only labels the table that follows
      if (t && !(t.endsWith(":") && t.length < 40)) intro.push(inline(el));
    }
  }
  return groups;
}

/* -------------------------------------------------------- vaccinations */

export interface HealthEntry {
  name: string;
  /** Where it applies, when the old page named it: "Brasilien". */
  where?: string;
  text: string;
}

export interface HealthSection {
  title: string;
  countries: string[];
  entries: HealthEntry[];
}

function healthEntry(name: string, advice: string): HealthEntry {
  const m = name.match(/^(.*?)\s*\((.+)\)$/);
  return m ? { name: m[1], where: m[2], text: advice } : { name, text: advice };
}

/** Impfung: each bold heading, its countries, and the diseases under it. */
export function parseHealth(html: string): HealthSection[] {
  const root = parse(html);
  dropTopLinks(root);
  const sections: HealthSection[] = [];
  for (const el of elKids(root)) {
    const heading = el.tagName === "P" ? el.querySelector("span.fett, strong") : null;
    if (heading) {
      const countries = text(el).slice(text(heading).length);
      sections.push({
        title: text(heading),
        countries: countries.split(",").map(clean).filter(Boolean),
        entries: [],
      });
      continue;
    }
    const section = sections.at(-1);
    if (!section) continue;
    if (el.tagName === "TABLE") {
      for (const tr of el.querySelectorAll("tr")) {
        const [name, advice] = tr.querySelectorAll("td");
        if (name && advice) section.entries.push(healthEntry(text(name), text(advice)));
      }
    } else if (el.tagName === "DIV") {
      // the yellow-fever box: name and advice as two nested boxes
      const [name, advice] = elKids(el).map(text);
      if (name && advice) section.entries.push(healthEntry(name, advice));
    }
  }
  return sections;
}

/* ------------------------------------------------------------- flights */

export interface Flight {
  /** "01. September 2008 / 08.10", or what the flight is ("Rückflug vorgemerkt"). */
  when: string;
  from: string;
  to: string;
  number: string;
}

export type FlightBlock =
  | { kind: "text"; html: string }
  | { kind: "steps"; html: string[] }
  | { kind: "questions"; html: string[] }
  | { kind: "allowance"; html: string[] }
  | { kind: "quote"; label: string; html: string };

const FLIGHT = /^(.+):\s+(.+?)\s+-\s+(.+?)\s+([A-Z]{2}\s?\d{2,4})$/;
const STEP = /^\d+\.\s/;
const PIECES = /^\d+\s+\D/;

/** A paragraph's lines, regrouped: numbered steps, runs of questions, prose. */
function flightBlocks(lines: string[]): FlightBlock[] {
  const out: FlightBlock[] = [];
  const kind = (l: string): FlightBlock["kind"] => {
    const t = plain(l);
    if (STEP.test(t)) return "steps";
    if (t.endsWith("?")) return "questions";
    if (PIECES.test(t)) return "allowance";
    return "text";
  };
  for (const line of lines) {
    const k = kind(line);
    const last = out.at(-1);
    if (k === "text") {
      if (last?.kind === "text") last.html += `<br>${line}`;
      else out.push({ kind: "text", html: line });
    } else if (last && last.kind === k) {
      (last as { html: string[] }).html.push(line);
    } else {
      out.push({ kind: k, html: [line] } as FlightBlock);
    }
  }
  // a single "question" or "allowance" line is just a sentence
  return out.map((b) =>
    (b.kind === "questions" || b.kind === "allowance") && b.html.length < 2 ? { kind: "text", html: b.html[0] } : b,
  );
}

/** Flüge: the section heading, the flights booked, then the story. */
export function parseFlights(html: string): { title?: string; flights: Flight[]; blocks: FlightBlock[] } {
  const root = parse(html);
  dropTopLinks(root);
  let title: string | undefined;
  const flights: Flight[] = [];
  const blocks: FlightBlock[] = [];
  for (const el of elKids(root)) {
    if (el.tagName !== "P") continue;
    if (el.classList.contains("fett") && !title) {
      title = text(el);
      continue;
    }
    const lines = htmlLines(el);
    const parsed = lines.map((l) => plain(l).match(FLIGHT));
    if (lines.length && parsed.every(Boolean)) {
      for (const m of parsed) flights.push({ when: m![1], from: m![2], to: m![3], number: m![4].replace(/\s/, " ") });
      continue;
    }
    const label = el.querySelector("span.fett, strong");
    if (label && plain(lines[0] ?? "") === text(label).replace(/\s+/g, " ") && /:$/.test(text(label))) {
      blocks.push({ kind: "quote", label: text(label).replace(/:$/, ""), html: lines.slice(1).join(" ") });
      continue;
    }
    blocks.push(...flightBlocks(lines));
  }
  return { title, flights, blocks };
}

/* ---------------------------------------------------------- statistics */

export interface StatSheet {
  label: string;
  image?: InfoImage;
  /** One PDF per leg: "Asien", "Ozeanien". */
  files: { label: string; href: string }[];
}

/** Statistiken: a picture per kind of statistic, and a PDF per leg. */
export function parseStats(html: string): StatSheet[] {
  const root = parse(html);
  const base = (href: string) => decodeURI(href).replace(/O?\.pdf$/i, "");
  // the Asia PDF's name, without the Oceania "O": "/media/6info/Krankenstatistik"
  const sheets = new Map<string, StatSheet>();
  const files: { label: string; href: string }[] = [];
  for (const a of root.querySelectorAll('a[href$=".pdf"]')) {
    const href = a.getAttribute("href")!;
    const img = a.querySelector("img");
    if (img) sheets.set(base(href), { label: clean(img.getAttribute("alt") ?? ""), image: image(img), files: [] });
    else files.push({ label: text(a), href });
  }
  for (const f of files) sheets.get(base(f.href))?.files.push(f);
  return [...sheets.values()];
}

/* ---------------------------------------------- reviews, sponsors, links */

/** Every picture link on a page: the product tests, the sponsors' logos. */
export function parseImageLinks(html: string): InfoLink[] {
  return parse(html)
    .querySelectorAll("table a")
    .flatMap((a) => {
      const img = a.querySelector("img");
      const href = a.getAttribute("href");
      return img && href ? [{ href, label: clean(img.getAttribute("alt") ?? ""), image: image(img) }] : [];
    });
}

/** The paragraphs before and after a page's table of logos, inline HTML. */
export function parseAround(html: string): { before: string[]; after: string[] } {
  const root = parse(html);
  dropTopLinks(root);
  const before: string[] = [];
  const after: string[] = [];
  let seen = false;
  for (const el of elKids(root)) {
    if (el.tagName === "TABLE") seen = true;
    else if (el.tagName === "P" && text(el)) (seen ? after : before).push(inline(el));
  }
  return { before, after };
}

export interface LinkList {
  title: string;
  links: InfoLink[];
}

/** Links: the lists under bold headings (planning tips, links, people met). */
export function parseLinkLists(html: string): LinkList[] {
  const root = parse(html);
  return elKids(root).flatMap((el) => {
    const heading = el.tagName === "DIV" ? el.querySelector("span.fett") : null;
    if (!heading) return [];
    const links = el.querySelectorAll("a").flatMap((a) => {
      const href = a.getAttribute("href");
      return href && text(a) ? [{ href: href.trim(), label: text(a) }] : [];
    });
    return links.length ? [{ title: text(heading), links }] : [];
  });
}

/* ---------------------------------------------------------- the index */

/** The Info page's photo and its caption ("Jesuitenkirche Luzern, Schweiz"). */
export function parseInfoIndex(html: string): { image?: InfoImage; caption?: string } {
  const root = parse(html);
  const img = root.querySelector("img");
  const caption = root.querySelector("span.klein");
  return {
    ...(img && { image: image(img) }),
    ...(caption && !/aktualisierung|updated/i.test(caption.text) && { caption: text(caption) }),
  };
}

/** A link's host for display: "www.rohloff.de" -> "rohloff.de". */
export function host(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}
