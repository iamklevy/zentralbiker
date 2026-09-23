import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Gallery as GalleryView } from "@/components/site/gallery";
import { ALL_GALLERIES, getGallery, getCountry } from "@/lib/content";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    ALL_GALLERIES.map((g) => ({ locale, slug: g.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gallery = getGallery(slug);
  return gallery ? { title: gallery.name } : {};
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const gallery = getGallery(slug);
  if (!gallery) notFound();

  // A country gallery links back to that country's written report.
  const country = getCountry(gallery.slug);

  return (
    <>
      <PageHero
        crumbs={[
          { label: t("section.fotos.title"), href: "/fotos" },
          { label: gallery.name },
        ]}
        title={gallery.name}
        lead={t("gallery.photos", { count: gallery.count })}
        meta={
          country?.report ? (
            <a
              href={`/berichte/${country.slug}`}
              className="text-[0.94rem] font-medium text-accent-2 underline underline-offset-4 hover:text-accent"
            >
              {t("leg.read")}
            </a>
          ) : undefined
        }
      />

      <Section>
        <GalleryView items={gallery.items} />
      </Section>
    </>
  );
}
