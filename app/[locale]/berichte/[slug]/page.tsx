import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Map } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Prose } from "@/components/site/prose";
import { Stagger, StaggerItem } from "@/components/site/motion";
import { Button } from "@/components/ui/button";
import {
  LEGS,
  getLeg,
  getCountry,
  legOf,
  neighbours,
  getPage,
  getPageByOldPath,
  getGalleryByDir,
} from "@/lib/content";

/**
 * One route serves two page kinds, because the old site's URLs did too:
 * /berichte/amerika is a leg index, /berichte/peru is a country report.
 * The slug spaces do not overlap, so a single dynamic segment is enough.
 */
export function generateStaticParams() {
  const slugs = [
    ...LEGS.map((l) => l.slug),
    ...LEGS.flatMap((l) => l.countries.map((c) => c.slug)),
  ];
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const leg = getLeg(slug);
  const country = getCountry(slug);
  const name = leg?.name ?? country?.name;
  if (!name) return {};

  const page = country?.report ? getPageByOldPath(country.report) : null;
  return {
    title: name,
    // First ~25 words of the report make a better description than a
    // generic template line.
    description: page?.text ? page.text.split(" ").slice(0, 28).join(" ") + " …" : undefined,
  };
}

export default async function BerichtPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const leg = getLeg(slug);
  if (leg) return <LegIndex slug={slug} />;

  const country = getCountry(slug);
  if (!country) notFound();

  // Looked up by original file path — see the note in /route/[slug]: section
  // spellings diverge, so a rebuilt "/berichte/<slug>" can silently miss.
  const page = country.report ? getPageByOldPath(country.report) : null;
  const parentLeg = legOf(country.slug);
  const { prev, next } = neighbours(country.slug);
  const gallery = getGalleryByDir(country.galleryDir);
  const routePage = country.route ? getPageByOldPath(country.route) : null;

  return (
    <>
      <PageHero
        crumbs={[
          { label: t("section.berichte.title"), href: "/berichte" },
          ...(parentLeg ? [{ label: parentLeg.name, href: `/berichte/${parentLeg.slug}` }] : []),
          { label: country.name },
        ]}
        title={country.name}
        image={gallery?.items.length ? `/media/${gallery.items[0].src}` : null}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <article>
            {page?.html ? (
              <Prose html={page.html} />
            ) : (
              <p className="text-muted">{t("leg.no_report")}</p>
            )}

            {/* prev / next through the whole journey, in travel order */}
            <nav className="mt-12 flex flex-wrap justify-between gap-4 border-t border-line pt-6">
              {prev ? (
                <Link
                  href={`/berichte/${prev.slug}`}
                  className="flex items-center gap-2 text-[0.94rem] text-ink-2 hover:text-accent-2"
                >
                  <ArrowLeft className="size-4" />
                  {prev.name}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/berichte/${next.slug}`}
                  className="flex items-center gap-2 text-[0.94rem] text-ink-2 hover:text-accent-2"
                >
                  {next.name}
                  <ArrowRight className="size-4" />
                </Link>
              )}
            </nav>
          </article>

          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.14em] text-accent-2">
              {t("leg.also")}
            </p>
            {gallery && (
              <SideLink
                href={`/fotos/${gallery.slug}`}
                icon={<Camera className="size-4" />}
                label={t("leg.photos")}
                note={t("gallery.photos", { count: gallery.count })}
              />
            )}
            {routePage && (
              <SideLink
                href={`/route/${country.slug}`}
                icon={<Map className="size-4" />}
                label={t("leg.route")}
              />
            )}
          </aside>
        </div>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------- leg index */

async function LegIndex({ slug }: { slug: string }) {
  const t = await getTranslations();
  const leg = getLeg(slug)!;
  const page = getPage(`/berichte/${leg.slug}`);
  const cover = leg.countries.map((c) => getGalleryByDir(c.galleryDir)).find((g) => g?.items.length);

  return (
    <>
      <PageHero
        crumbs={[{ label: t("section.berichte.title"), href: "/berichte" }, { label: leg.name }]}
        title={leg.name}
        lead={t("leg.countries", { count: leg.countries.length })}
        image={cover?.items.length ? `/media/${cover.items[0].src}` : null}
      />

      {page?.html && (
        <Section>
          <Prose html={page.html} className="max-w-[68ch]" />
        </Section>
      )}

      <Section tint={Boolean(page?.html)}>
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leg.countries.map((country) => {
            const gallery = getGalleryByDir(country.galleryDir);
            return (
              <StaggerItem key={country.slug}>
                <Link
                  href={`/berichte/${country.slug}`}
                  className="group block h-full overflow-hidden rounded-card border border-line bg-paper shadow-soft transition-shadow hover:shadow-lift"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-stone">
                    {gallery?.items.length ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/media/${gallery.items[0].thumb}`}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="text-[1.1rem]">{country.name}</h3>
                    {gallery && (
                      <p className="mt-0.5 text-[0.85rem] text-muted">
                        {t("gallery.photos", { count: gallery.count })}
                      </p>
                    )}
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Section>
    </>
  );
}

function SideLink({
  href,
  icon,
  label,
  note,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  note?: string;
}) {
  return (
    <Button asChild variant="outline" className="h-auto w-full justify-start rounded-card py-3">
      <Link href={href}>
        <span className="text-accent-2">{icon}</span>
        <span className="flex flex-col items-start leading-tight">
          <span className="font-medium">{label}</span>
          {note && <span className="text-[0.82rem] font-normal text-muted">{note}</span>}
        </span>
      </Link>
    </Button>
  );
}
