/**
 * Country names the old German pages left in English: "New Zealand" in the
 * menus, headings and photo captions, where the rest of the site (journey.json,
 * build-content.mjs's NAMES) says "Neuseeland". Shared by extract.mjs and
 * build-chrome.mjs; the English site translates the German back.
 */
const NAMES = [[/New Zealand/g, "Neuseeland"]];

/** The text with its names in German. */
export const germanName = (text) => NAMES.reduce((s, [re, name]) => s.replace(re, name), text);

/**
 * The same over a parsed page: its text and the words people see in alt and
 * title. Never src or href: the files are still named "… - New Zealand.jpg".
 */
export function germanNames(root) {
  const walk = (node) => {
    if (node.nodeType === 3) node.rawText = germanName(node.rawText);
    for (const attr of ["alt", "title"]) {
      const value = node.getAttribute?.(attr);
      if (value) node.setAttribute(attr, germanName(value));
    }
    node.childNodes?.forEach(walk);
  };
  walk(root);
}
