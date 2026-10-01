import { useLocale } from "next-intl";

import { cn } from "@/lib/utils";
import { rewriteMediaHtml } from "@/lib/media";
import { getPathname } from "@/i18n/navigation";

/**
 * Renders a migrated page body.
 *
 * The HTML has already been through scripts/extract.mjs: nav lists removed,
 * layout tables unwrapped, legacy presentation attributes stripped, and every
 * internal href/src rewritten to a new-site path. What is left is plain
 * semantic markup, so all the styling lives in the `.prose-zb` rules in
 * app/globals.css rather than in per-element classes here.
 */
export function Prose({ html, className }: { html: string; className?: string }) {
  const locale = useLocale();
  return (
    <div
      className={cn("prose-zb", className)}
      dangerouslySetInnerHTML={{ __html: localizeLinks(rewriteMediaHtml(html), locale) }}
    />
  );
}

/**
 * Page links in the HTML are German site paths (the translation check keeps
 * them identical to the original). On the English site they have to point at
 * the English URL, or every click would drop the reader back into German.
 */
function localizeLinks(html: string, locale: string): string {
  return html.replace(/(\shref=")(\/(?!media\/)[^"#?]*)([^"]*)"/g, (_, attr: string, path: string, rest: string) => {
    return `${attr}${getPathname({ href: path, locale })}${rest}"`;
  });
}
