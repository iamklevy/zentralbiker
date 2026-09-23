import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next 16 renamed the `middleware` convention to `proxy`; behaviour is identical.
export default createMiddleware(routing);

export const config = {
  /**
   * Run on everything except API routes, Next internals and static files.
   * NOTE the double backslash: in a JS string "\." collapses to ".", which
   * turns the "has a file extension" exclusion into "has any character" and
   * silently stops the proxy running on every real page.
   */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
