/** localStorage key for the reader's light/dark choice. */
export const THEME_KEY = "zb-theme";

/**
 * Puts "dark" on <html> if the reader chose it, or, with no choice stored, if
 * the system prefers it. Self-contained (no outer references), because its
 * source is also inlined as THEME_SCRIPT.
 */
export function applyTheme(key: string) {
  try {
    const t = localStorage.getItem(key);
    if (t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches))
      document.documentElement.classList.add("dark");
  } catch {
    // storage blocked: stay light
  }
}

/** Runs in <head> before the first paint, so a dark page never flashes light. */
export const THEME_SCRIPT = `(${applyTheme.toString()})(${JSON.stringify(THEME_KEY)})`;
