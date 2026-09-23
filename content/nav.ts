/**
 * Site navigation, mirroring the original information architecture.
 *
 * The old site split navigation in two: a horizontal main bar (Home,
 * Ausruestung, Berichte, Fotos, Route, Info, Varia) and a small sidebar list
 * of the three "about" pages. Both are preserved here — the sidebar entries
 * now hang off Home as a dropdown instead of floating in the left column.
 *
 * `labelKey` indexes into messages/<locale>.json under `nav.`.
 */

export interface NavChild {
  href: string;
  labelKey: string;
}

export interface NavItem {
  href: string;
  labelKey: string;
  children?: NavChild[];
}

export const MAIN_NAV: NavItem[] = [
  {
    href: "/",
    labelKey: "home",
    children: [
      { href: "/ueber-uns", labelKey: "ueber_uns" },
      { href: "/claudia", labelKey: "claudia" },
      { href: "/alexandre", labelKey: "alexandre" },
    ],
  },
  { href: "/ausruestung", labelKey: "ausruestung" },
  { href: "/berichte", labelKey: "berichte" },
  { href: "/fotos", labelKey: "fotos" },
  { href: "/route", labelKey: "route" },
  { href: "/info", labelKey: "info" },
  { href: "/varia", labelKey: "varia" },
];

/** Sections that render an index page listing their migrated sub-pages. */
export const INDEX_SECTIONS = ["ausruestung", "info", "varia"] as const;

/**
 * Header banners, one per top-level section — the old site swapped a
 * 1000x140 Lucerne photo above the nav on every section (luzern1..7, in
 * `MAIN_NAV` order). Kept as the hero background image on each section's
 * index page so picking a different menu item still changes the picture.
 */
export const SECTION_BANNERS: Record<string, string> = {
  "/": "/media/images/kopf/luzern1_1000x140.jpg",
  "/ausruestung": "/media/images/kopf/luzern2_1000x140.jpg",
  "/berichte": "/media/images/kopf/luzern3_1000x140.jpg",
  "/fotos": "/media/images/kopf/luzern4_1000x140.jpg",
  "/route": "/media/images/kopf/luzern5_1000x140.jpg",
  "/info": "/media/images/kopf/luzern6_1000x140.jpg",
  "/varia": "/media/images/kopf/luzern7_1000x140.jpg",
};

/** Locale display names for the language switcher. */
export const LOCALE_NAMES: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
};
