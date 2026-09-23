import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Stagger, StaggerItem } from "@/components/site/motion";
import { LEGS, getGalleryByDir } from "@/lib/content";
import { SECTION_BANNERS } from "@/content/nav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "section.berichte" });
  return { title: t("title"), description: t("lead") };
}

export default async function BerichteIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <PageHero
        crumbs={[{ label: t("section.berichte.title") }]}
        title={t("section.berichte.title")}
        lead={t("section.berichte.lead")}
        image={SECTION_BANNERS["/berichte"]}
      />

      {LEGS.map((leg) => (
        <Section key={leg.slug} tint={leg.order % 2 === 0}>
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[clamp(1.4rem,1.1rem+1.2vw,2rem)]">
              <Link href={`/berichte/${leg.slug}`} className="hover:text-accent-2">
                {leg.name}
              </Link>
            </h2>
            <p className="text-[0.9rem] text-muted">
              {t("leg.countries", { count: leg.countries.length })}
            </p>
          </div>

          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leg.countries.map((country) => {
              const gallery = getGalleryByDir(country.galleryDir);
              return (
                <StaggerItem key={country.slug}>
                  <Link
                    href={`/berichte/${country.slug}`}
                    className="group flex h-full gap-4 overflow-hidden rounded-card border border-line bg-paper p-3 shadow-soft transition-shadow hover:shadow-lift"
                  >
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-stone">
                      {gallery?.items.length ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/media/${gallery.items[0].thumb}`}
                          alt=""
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 self-center">
                      <h3 className="text-[1.05rem] leading-snug">{country.name}</h3>
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
      ))}
    </>
  );
}
