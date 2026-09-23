import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/site/page-hero";
import { Section, SectionHead } from "@/components/site/section";
import { Stagger, StaggerItem } from "@/components/site/motion";
import { HIGHLIGHT_GALLERIES, COUNTRY_GALLERIES, type Gallery } from "@/lib/content";
import { SECTION_BANNERS } from "@/content/nav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "section.fotos" });
  return { title: t("title"), description: t("lead") };
}

export default async function FotosIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <PageHero
        crumbs={[{ label: t("section.fotos.title") }]}
        title={t("section.fotos.title")}
        lead={t("section.fotos.lead")}
        image={SECTION_BANNERS["/fotos"]}
      />

      {HIGHLIGHT_GALLERIES.length > 0 && (
        <Section>
          <SectionHead title="Highlights" />
          <GalleryGrid galleries={HIGHLIGHT_GALLERIES} large />
        </Section>
      )}

      <Section tint={HIGHLIGHT_GALLERIES.length > 0}>
        <SectionHead title={t("section.fotos.title")} />
        <GalleryGrid galleries={COUNTRY_GALLERIES} />
      </Section>
    </>
  );
}

async function GalleryGrid({ galleries, large }: { galleries: Gallery[]; large?: boolean }) {
  const t = await getTranslations();
  return (
    <Stagger
      className={
        large
          ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          : "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      }
    >
      {galleries.map((gallery) => (
        <StaggerItem key={gallery.dir}>
          <Link
            href={`/fotos/${gallery.slug}`}
            className="group block overflow-hidden rounded-card border border-line bg-paper shadow-soft transition-shadow hover:shadow-lift"
          >
            <div className={`relative overflow-hidden bg-stone ${large ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/media/${gallery.items[0]?.thumb}`}
                alt=""
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <h3 className={large ? "text-[1.2rem]" : "text-[1.02rem]"}>{gallery.name}</h3>
              <p className="mt-0.5 text-[0.85rem] text-muted">
                {t("gallery.photos", { count: gallery.count })}
              </p>
            </div>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
