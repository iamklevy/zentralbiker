"use client";

import { useLayoutEffect } from "react";

import { applyTheme, THEME_KEY, THEME_SCRIPT } from "@/lib/theme";

/**
 * Sets the light/dark class on <html> before the first paint.
 *
 * In the server HTML this is a real script, so the browser runs it while
 * parsing <head>. React never runs scripts it creates itself, and warns when it
 * meets one, which happens when the [locale] layout mounts in the browser (the
 * language switch is a client navigation). There the tag is an inert data block
 * and the layout effect applies the theme instead, still before paint.
 */
export function ThemeScript() {
  useLayoutEffect(() => {
    applyTheme(THEME_KEY);
  }, []);

  return (
    <script
      // Differs between server and client on purpose; see above.
      type={typeof window === "undefined" ? undefined : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
