/**
 * Site navigation, exactly as the original laid it out: a horizontal main bar
 * (Home, Ausrüstung, Berichte, Fotos, Route, Info, Varia) above the content,
 * and a per-page sidebar list on the left. The sidebar is copied from each
 * old page by scripts/build-chrome.mjs, because it varies within a section
 * (a gallery lists only its own sub-continent) — this file only holds the
 * fallback for pages that had none.
 *
 * `labelKey` indexes into messages/<locale>.json under `nav.`.
 */

export interface NavItem {
  href: string;
  labelKey: string;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/ausruestung", labelKey: "ausruestung" },
  { href: "/berichte", labelKey: "berichte" },
  { href: "/fotos", labelKey: "fotos" },
  { href: "/route", labelKey: "route" },
  { href: "/info", labelKey: "info" },
  { href: "/varia", labelKey: "varia" },
];

/**
 * The 1000x140 Lucerne photo band above every page — a different shot per
 * section, luzern1..7 in MAIN_NAV order.
 */
export const SECTION_BANNERS: Record<string, string> = {
  "/": "luzern1_1000x140.jpg",
  "/ausruestung": "luzern2_1000x140.jpg",
  "/berichte": "luzern3_1000x140.jpg",
  "/fotos": "luzern4_1000x140.jpg",
  "/route": "luzern5_1000x140.jpg",
  "/info": "luzern6_1000x140.jpg",
  "/varia": "luzern7_1000x140.jpg",
};

/** The top-level section a path belongs to ("/berichte/peru" -> "/berichte"). */
export function sectionOf(path: string): string {
  const first = path.split("/")[1] ?? "";
  if (MAIN_NAV.some((n) => n.href === `/${first}`)) return `/${first}`;
  return "/"; // /ueber-uns, /claudia, /alexandre hang off Home, as they did
}

/**
 * The page one level up, for the "back to …" button: a section's pages go to
 * the section, a section to Home, and the two portraits to "Über uns", where
 * they are reached from. Home has none.
 */
export function parentOf(path: string): { href: string; labelKey: string } | null {
  if (path === "/") return null;
  if (path === "/claudia" || path === "/alexandre") return { href: "/ueber-uns", labelKey: "ueber_uns" };
  const section = sectionOf(path);
  if (section !== "/" && path !== section) {
    return { href: section, labelKey: MAIN_NAV.find((n) => n.href === section)!.labelKey };
  }
  return { href: "/", labelKey: "home" };
}

/** Home's sidebar — also the fallback for the three "about" pages. */
export const HOME_SIDEBAR = [
  { labelKey: "ueber_uns", href: "/ueber-uns" },
  { labelKey: "claudia", href: "/claudia" },
  { labelKey: "alexandre", href: "/alexandre" },
];
