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
 * The photo band above every page — one Swiss shot per section, in MAIN_NAV
 * order. The files live in public/images/kopf (served by the app itself, not
 * the media bucket), pre-cropped to 2.5:1 with the subject where the thin
 * desktop strip shows it.
 */
export const SECTION_BANNERS: Record<string, string> = {
  "/": "home-luzern-kapellbruecke.jpg",
  "/ausruestung": "ausruestung-rheinschlucht-ruinaulta.jpg",
  "/berichte": "berichte-schloss-chillon.jpg",
  "/fotos": "fotos-matterhorn-riffelsee.jpg",
  "/route": "route-gotthard-tremola.jpg",
  "/info": "info-urnersee-fronalpstock.jpg",
  "/varia": "varia-dampfschiff-stadt-luzern.jpg",
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
