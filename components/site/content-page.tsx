import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Prose } from "@/components/site/prose";
import { getPage, pagesInSection } from "@/lib/content";

/**
 * Renders any migrated one-off page (Ausrüstung/*, Info/*, Varia/*, the
 * three "about" pages). All of these are the same shape — a hero with
 * breadcrumbs and a body of migrated HTML — so they share one component
 * instead of a near-identical file per route.
 */
export async function ContentPage({
  path,
  title,
  crumbs,
}: {
  path: string;
  title: string;
  crumbs: { label: string; href?: string }[];
}) {
  const t = await getTranslations();
  const page = getPage(path);
  if (!page) notFound();

  return (
    <>
      <PageHero crumbs={crumbs} title={title} />
      <Section>
        {page.html ? <Prose html={page.html} /> : <p className="text-muted">{t("leg.no_report")}</p>}
      </Section>
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
