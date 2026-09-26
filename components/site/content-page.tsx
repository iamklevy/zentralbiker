import { notFound } from "next/navigation";

import { Prose } from "@/components/site/prose";
import { getPage, getPageByOldPath, pagesInSection, type MigratedPage } from "@/lib/content";

/**
 * Renders a migrated page exactly as the old site showed it: the original
 * body, inside the original frame (see SiteChrome). Used by every route that
 * is just "that old page, cleaned up" — which is nearly all of them.
 */
export function ContentPage({
  path,
  oldPath,
  locale,
  children,
}: {
  /** New-site path, e.g. "/ausruestung/kochen". */
  path?: string;
  /** Or the original file, when spellings differ between sections. */
  oldPath?: string;
  locale: string;
  /** Rendered after the body (forms, galleries). */
  children?: React.ReactNode;
}) {
  const page: MigratedPage | null = oldPath
    ? getPageByOldPath(oldPath, locale)
    : path
      ? getPage(path, locale)
      : null;
  if (!page && !children) notFound();

  return (
    <>
      {page?.html && <Prose html={page.html} />}
      {children}
    </>
  );
}

/** Slug list for a section's generateStaticParams. */
export function sectionSlugs(section: string): string[] {
  return pagesInSection(section).map((p) => p.path.split("/").pop()!);
}

/** Shared title-casing for slugs, with the umlauts the filenames dropped. */
export function titleFromSlug(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUeber\b/, "Über")
    .replace(/\bGaestebuch\b/, "Gästebuch")
    .replace(/\bFluege\b/, "Flüge")
    .replace(/\bAusruestung\b/, "Ausrüstung");
}
