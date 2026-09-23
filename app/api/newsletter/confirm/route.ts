import { NextRequest, NextResponse } from "next/server";
import { confirmToken } from "@/lib/newsletter/actions";

/**
 * Double opt-in landing point.
 *
 * Lives outside the [locale] tree because the token link is generated in an
 * email where the reader's locale is not known — it always redirects back to
 * the un-prefixed (German) newsletter page with a result flag, which the page
 * turns into a success or failure banner.
 *
 * The route is excluded from the locale proxy by the `api` branch of the
 * matcher in proxy.ts.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const ok = await confirmToken(token);

  const url = new URL("/varia/newsletter", request.nextUrl.origin);
  url.searchParams.set("confirmed", ok ? "1" : "0");
  return NextResponse.redirect(url);
}
