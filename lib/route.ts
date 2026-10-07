import { parse, type HTMLElement } from "node-html-parser";

import { getPage, getPageByOldPath, LEGS, localName, type Country, type Leg } from "@/lib/content";
import tracksJson from "@/content/generated/tracks.json";
import routedTracksJson from "@/content/generated/routed-tracks.json";

/**
 * Reads the old route pages into data, so the route section can be laid out
 * afresh instead of showing their 2008 tables. A country page holds, in some
 * order: a box per country with its flag and facts ("Hauptstadt: Lima"), the
 * route cycled as "A - B -> Border to X - C / 2'012 km", a map (the American
 * leg) and a table of daily stages (Asia and Oceania). Anything not found is
 * left out; a page with none of it falls back to its old HTML.
 */

export interface CountryFacts {
  name: string;
  flag?: { src: string; alt: string };
  facts: { label: string; value: string }[];
  /** Lines that aren't "Label: value" ("Die Insel ist aufgeteilt …"). */
  notes: string[];
}

/** A stop on the route; `border` marks a crossing ("Border to Argentinien"). */
export interface Stop {
  place: string;
  border?: string;
}

/** A stretch of the route with its distance, as the page wrote it ("2'012"). */
export interface RoutePart {
  stops: Stop[];
  km: string;
}

export type Night ="hotel" | "tent" | "guesthouse" | "border" | "bus" | "train" | "other";

export interface Stage {
  date: string;
  place: string;
  distance: string;
  gain: string;
  altitude: string;
  time: string;
  night?: Night;
  temperature: string;
  comment: string;
}

export interface StageTable {
  year: string;
  stages: Stage[];
  total?: Stage;
}

export interface RouteCountry {
  countries: CountryFacts[];
  route?: { note?: string; parts: RoutePart[] };
  maps: { src: string; alt: string; width?: number; height?: number }[];
  credit?: { href: string; text: string };
  tables: StageTable[];
}

/** Media path relative to the media root, as mediaUrl() wants it. */
const media = (src: string) => decodeURI(src).replace(/^\/media\//, "");
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** "2'012", "2,012" or "2’012" km -> 2012. */
export function kmNumber(km: string | undefined): number {
  return km ? Number(km.replace(/[^\d]/g, "")) || 0 : 0;
}

/** Lines of an element split at its <br>s. */
function brLines(el: HTMLElement): string[] {
  return el.innerHTML
    .split(/<br\s*\/?>/i)
    .map((part) => clean(parse(part).text))
    .filter(Boolean);
}

const FACT = /^([^:]{2,30}):\s*(\S.*)$/;

/** Facts blocks: the innermost cells whose lines read "Label: value". */
function countryFacts(root: HTMLElement): CountryFacts[] {
  const blocks = root.querySelectorAll("td, div").filter((el) => {
    if (!/<br/i.test(el.innerHTML) || /Route|Etappe|Stage/i.test(el.text)) return false;
    const lines = brLines(el);
    return lines.filter((l) => FACT.test(l)).length >= 2;
  });
  const innermost = blocks.filter((b) => !blocks.some((o) => o !== b && b.querySelectorAll("*").includes(o)));

  return innermost.map((block) => {
    // the name and flag sit next to the facts, in the same table or box
    // (the flag's cell is bold too, but empty: skip to the one with words)
    const named = (el: HTMLElement) => el.querySelectorAll(".fett").find((f) => clean(f.text));
    let box: HTMLElement | null = block.parentNode;
    while (box && !named(box) && box.parentNode) box = box.parentNode;
    const name = clean((box && named(box)?.text) ?? "");
    const img = box?.querySelector('img[src*="flaggen"]');
    return {
      name,
      flag: img ? { src: media(img.getAttribute("src")!), alt: img.getAttribute("alt") || name } : undefined,
      facts: brLines(block).flatMap((line) => {
        const m = FACT.exec(line);
        return m ? [{ label: m[1].trim(), value: m[2].trim() }] : [];
      }),
      notes: brLines(block).filter((line) => !FACT.test(line)),
    };
  });
}

const ROUTE_LABEL = /(?:Gefahrene Route|Route cycled)\s*(?:\(([^)]*)\))?\s*:/i;
/** One part: "A - B -> Border to X - C / 2'012 km", at the start of the text. */
const ROUTE_PART = /^\s*([^/]*?)\/\s*([\d'’.,]+)\s*km/;

const stopsOf = (text: string): Stop[] =>
  text
    .split(/\s+[-–]\s+/) // hyphens or en dashes, depending on the page
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const [place, border] = part.split(/\s*->\s*/);
      return { place, ...(border && { border }) };
    });

/**
 * The route cycled, in as many parts as the page lists — Malaysia has two
 * (Pak Bai - Johor Bahru / 772 km, then Johor Bahru - Kuala Lumpur / 447 km).
 * Parts are read one after another until the text stops looking like one.
 */
function routeLine(root: HTMLElement): RouteCountry["route"] {
  const text = clean(root.text);
  const label = ROUTE_LABEL.exec(text);
  if (!label) return undefined;
  let rest = text.slice(label.index + label[0].length);
  const parts: RoutePart[] = [];
  for (let m = ROUTE_PART.exec(rest); m; m = ROUTE_PART.exec(rest)) {
    parts.push({ stops: stopsOf(m[1]), km: m[2] });
    rest = rest.slice(m[0].length);
  }
  return parts.length ? { note: label[1]?.trim(), parts } : undefined;
}

/** All of a route's kilometres, its parts added up. */
export function routeKm(route: RouteCountry["route"]): number {
  return route?.parts.reduce((n, p) => n + kmNumber(p.km), 0) ?? 0;
}

const NIGHTS: [RegExp, Night][] = [
  [/hotel/i, "hotel"],
  [/zelt/i, "tent"],
  [/guest/i, "guesthouse"],
  [/zoll/i, "border"],
  [/bus/i, "bus"],
  [/zug/i, "train"],
];

/** The cells of a row laid out by column, colspans spread out. */
function columns(tr: HTMLElement): (HTMLElement | null)[] {
  const out: (HTMLElement | null)[] = [];
  for (const td of tr.querySelectorAll("td")) {
    out.push(td);
    for (let i = 1; i < (Number(td.getAttribute("colspan")) || 1); i++) out.push(null);
  }
  return out;
}

function stage(cells: (HTMLElement | null)[]): Stage {
  const text = (i: number) => clean(cells[i]?.text ?? "");
  const img = cells[6]?.querySelector("img")?.getAttribute("src") ?? "";
  return {
    date: text(0),
    place: text(1),
    distance: text(2),
    gain: text(3),
    altitude: text(4),
    time: text(5),
    night: img ? (NIGHTS.find(([re]) => re.test(img.split("/").pop()!))?.[1] ?? "other") : undefined,
    temperature: text(7),
    comment: text(8),
  };
}

/** Stage tables have a column per figure: nine across, in a fixed order. */
function stageTables(root: HTMLElement): StageTable[] {
  return root
    .querySelectorAll("table")
    .filter((t) => (t.querySelector("tr")?.querySelectorAll("th,td").length ?? 0) >= 7)
    .map((table) => {
      const [head, ...rows] = table.querySelectorAll("tr");
      const result: StageTable = { year: clean(head.querySelector("th,td")?.text ?? ""), stages: [] };
      for (const tr of rows) {
        const cells = columns(tr);
        if (!cells.length) continue;
        const row = stage(cells);
        if (Number(cells[0]?.getAttribute("colspan")) >= 2 || /^total/i.test(row.date)) {
          result.total = { ...row, place: row.date, date: "" };
        } else if (row.date || row.place) {
          result.stages.push(row);
        }
      }
      return result;
    })
    .filter((t) => t.stages.length > 0);
}

export function parseRouteCountry(html: string): RouteCountry | null {
  const root = parse(html);
  const page: RouteCountry = {
    countries: countryFacts(root),
    route: routeLine(root),
    maps: root.querySelectorAll('img[src*="karten"]').map((img) => ({
      src: media(img.getAttribute("src")!),
      alt: img.getAttribute("alt") ?? "",
      width: Number(img.getAttribute("width")) || undefined,
      height: Number(img.getAttribute("height")) || undefined,
    })),
    credit: (() => {
      const a = root.querySelector('a[href*="mapz"]');
      return a ? { href: a.getAttribute("href")!, text: clean(a.text) } : undefined;
    })(),
    tables: stageTables(root),
  };
  const found = page.countries.length || page.route || page.maps.length || page.tables.length;
  return found ? page : null;
}

/**
 * Flags for pages that never had one. Borneo is an island, not a country: the
 * loop from Lahad Datu stayed in Sabah, so it gets Sabah's state flag
 * (public domain, Wikimedia Commons).
 */
const MISSING_FLAGS: Record<string, { src: string; alt: string }> = {
  borneo: { src: "images/flaggen/30borneo_sabah.png", alt: "Sabah" },
};

/** A country's route page, read; null when it has none or it can't be read. */
export function routeCountry(country: Country, locale: string): RouteCountry | null {
  const html = country.route ? getPageByOldPath(country.route, locale)?.html : null;
  const page = html ? parseRouteCountry(html) : null;
  const flag = MISSING_FLAGS[country.slug];
  if (page && flag && page.countries[0] && !page.countries[0].flag) page.countries[0].flag = flag;
  return page;
}

/** The countries of a leg that have a route page. */
export const routeCountries = (leg: Leg) => leg.countries.filter((c) => c.route);

/** The big map of a whole leg, from its old index page. */
export function legMap(leg: Leg, locale: string): RouteCountry["maps"][number] | undefined {
  const page = getPage(`/route/${leg.slug}`, locale);
  return page ? parseRouteCountry(page.html)?.maps[0] : undefined;
}

/** The old overview's map "business card" of each leg: { amerika: path }. */
export function legCards(locale: string): Record<string, string> {
  const page = getPage("/route", locale);
  const cards: Record<string, string> = {};
  for (const a of page ? parse(page.html).querySelectorAll('a[href^="/route/"]') : []) {
    const img = a.querySelector("img");
    if (img) cards[a.getAttribute("href")!.split("/")[2]] = media(img.getAttribute("src")!);
  }
  return cards;
}

/** Previous and next country with a route page, across the whole journey. */
export function routeNeighbours(slug: string): { prev?: Country; next?: Country } {
  const all = LEGS.flatMap(routeCountries);
  const i = all.findIndex((c) => c.slug === slug);
  return { prev: all[i - 1], next: all[i + 1] };
}

/**
 * One recorded day of a track, as the old map's info box showed it. Times in
 * minutes, heights in metres; a drawn (planned) route has only `km`.
 */
export interface DayInfo {
  km: number;
  date?: string;
  duration?: number;
  moving?: number;
  speed?: number;
  up?: number;
  down?: number;
  min?: number;
  max?: number;
  /** A routed hop between two stops (see `Track.planned`). */
  from?: string;
  to?: string;
  /** No road found: the hop is a straight line (train, ferry). */
  straight?: boolean;
}

/** A section of a country's route: its lines (one per day) and their info. */
export interface Track {
  label: string;
  lines: [number, number][][];
  info: DayInfo[];
  /** Not recorded but routed from the page's stops: one line per hop. */
  planned?: boolean;
}

interface TrackData extends Track {
  file?: string;
  km: number;
}
/**
 * GPS tracks per route page, from scripts/build-tracks.mjs; the American leg,
 * which has none, routed from its stops by scripts/build-routed-tracks.mjs.
 */
const TRACKS = {
  ...(routedTracksJson as unknown as Record<string, TrackData[]>),
  ...(tracksJson as unknown as Record<string, TrackData[]>),
};

/**
 * A country's GPS tracks, for its map. The section names come from the old
 * German drop-down ("1 Chile, Ollagüe bis Paso Sico"); English gets "to".
 */
export function routeTracks(country: Country, locale: string): Track[] {
  const tracks = country.route ? (TRACKS[country.route] ?? []) : [];
  // "1 New Zealand, Auckland bis Tauranga": when every section names the same
  // country, the name says nothing — keep "1 Auckland bis Tauranga". (Chile's
  // sections switch between Chile and Argentinien, so theirs stay.)
  const sectionCountry = (label: string) => /^(?:\d+\s+)?([^,]+),/.exec(label)?.[1];
  const shared = tracks.length > 1 && new Set(tracks.map((t) => sectionCountry(t.label))).size === 1 ? sectionCountry(tracks[0].label) : undefined;
  return tracks.map(({ label, lines, info, planned }) => {
    let text = shared ? label.replace(`${shared}, `, "") : label;
    if (locale !== "de") text = text.replace(/ bis /g, " to ");
    return { label: text, lines, info, ...(planned && { planned }) };
  });
}

/** Douglas–Peucker on [lat, lon]s, as scripts/gpx-tracks.mjs does it. */
function thin(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    const [ax, ay] = points[first];
    const [dx, dy] = [points[last][0] - ax, points[last][1] - ay];
    const len = Math.hypot(dx, dy) || 1e-12;
    let [worst, index] = [0, -1];
    for (let i = first + 1; i < last; i++) {
      const d = Math.abs(dy * (points[i][0] - ax) - dx * (points[i][1] - ay)) / len;
      if (d > worst) [worst, index] = [d, i];
    }
    if (worst > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * A whole leg on one map: a section per country, named after it, its tracks
 * joined. Seen from that far out the lines are thinned to ~300 m, which keeps
 * a leg to a fraction of its countries' full detail.
 */
export function legTracks(leg: Leg, locale: string): Track[] {
  return routeCountries(leg).flatMap((country) => {
    const tracks = routeTracks(country, locale);
    if (!tracks.length) return [];
    return [
      {
        label: localName(country.slug, country.name, locale),
        lines: tracks.flatMap((t) => t.lines.map((line) => thin(line, 0.003))),
        info: tracks.flatMap((t) => t.info),
        ...(tracks.some((t) => t.planned) && { planned: true }),
      },
    ];
  });
}
