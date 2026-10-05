/** localStorage key for the reader's light/dark choice. */
export const THEME_KEY = "zb-theme";

/**
 * Runs in <head> before the first paint, so a dark page never flashes light:
 * the reader's own choice if they made one, otherwise the system setting.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
