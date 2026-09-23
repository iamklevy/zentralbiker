import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen, Camera } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Prose } from "@/components/site/prose";
import { Button } from "@/components/ui/button";
import {
  LEGS,
  getLeg,
  getCountry,
  legOf,
  getPage,
  getPageByOldPath,
  getGalleryByDir,
} from "@/lib/content";

/** Same two-kinds-of-page arrangement as /berichte/[slug]: leg index or country. */
export function generateStaticParams() {
  const slugs = [
    ...LEGS.map((l) => l.slug),
    ...LEGS.flatMap((l) => l.countries.filter((c) => c.route).map((c) => c.slug)),
  ];
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = getLeg(slug)?.name ?? getCountry(slug)?.name;
  return name ? { title: name } : {};
}

export default async function RoutePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const leg = getLeg(slug);
  const country = leg ? null : getCountry(slug);
  if (!leg && !country) notFound();

  /*
   * A country's body is fetched by its original file path, not by rebuilding
   * "/route/<slug>". The old site is not consistent about spelling across
   * sections — the Oceania leg's report is `331bolivien.html` while its route
   * page is `531bolivia.html` — so a reconstructed path silently misses and
   * the page renders its empty state. The old path is the one unambiguous key.
   */
  const page = country
    ? (country.route ? getPageByOldPath(country.route) : null)
    : getPage(`/route/${slug}`);
  const parentLeg = country ? legOf(country.slug) : null;
  const gallery = country ? getGalleryByDir(country.galleryDir) : null;

  return (
    <>
      <PageHero
        crumbs={[
          { label: t("section.route.title"), href: "/route" },
          ...(parentLeg ? [{ label: parentLeg.name, href: `/route/${parentLeg.slug}` }] : []),
          { label: leg?.name ?? country!.name },
        ]}
        title={leg?.name ?? country!.name}
      />

      <Section>
        {page?.html ? <Prose html={page.html} /> : <p className="text-muted">{t("leg.no_report")}</p>}

        {country && (
          <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
            {country.report && (
              <Button asChild variant="outline" className="rounded-full">
                <Link href={`/berichte/${country.slug}`}>
                  <BookOpen className="size-4" />
                  {t("leg.read")}
                </Link>
              </Button>
            )}
            {gallery && (
              <Button asChild variant="outline" className="rounded-full">
                <Link href={`/fotos/${gallery.slug}`}>
                  <Camera className="size-4" />
                  {t("leg.photos")}
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* A leg index lists the countries it covers. */}
        {leg && (
          <div className="mt-8 flex flex-wrap gap-2">
            {leg.countries
              .filter((c) => c.route)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/route/${c.slug}`}
                  className="inline-flex rounded-full border border-line bg-paper px-4 py-2 text-[0.94rem] text-ink-2 shadow-soft transition-colors hover:border-accent hover:text-accent-2"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        )}
      </Section>
    </>
  );
}
