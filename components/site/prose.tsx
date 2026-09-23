import { cn } from "@/lib/utils";

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
  return <div className={cn("prose-zb", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
