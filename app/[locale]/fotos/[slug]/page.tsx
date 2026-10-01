import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { PhotoOverview } from "@/components/site/photo-overview";
import { Gallery as GalleryView } from "@/components/site/gallery";
import { ALL_GALLERIES, FOTO_OVERVIEWS, getGallery, getPage, localName, translatedTitle } from "@/lib/content";
import { pageAlternates } from "@/lib/seo";

/**
 * Two kinds of page here too: a photo gallery (thumbnail grid + lightbox),
 * or one of the overview pages — Nordamerika, Filme Asien, … — that were
 * plain pages of thumbnails linking onward.
 */
export function generateStaticParams() {
  const slugs = [
    ...ALL_GALLERIES.filter((g) => g.slug !== "galeriebilder").map((g) => g.slug),
    ...FOTO_OVERVIEWS,
  ];
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const gallery = getGallery(slug);
  const title = gallery ? localName(slug, gallery.name, locale) : translatedTitle(`/fotos/${slug}`, locale);
  return { ...(title && { title }), alternates: pageAlternates(`/fotos/${slug}`, locale) };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const gallery = slug === "galeriebilder" ? null : getGallery(slug);
  if (!gallery) {
    if (!getPage(`/fotos/${slug}`)) notFound();
    return <PhotoOverview path={`/fotos/${slug}`} locale={locale} />;
  }

  return (
    <>
      <h1>{localName(slug, gallery.name, locale)}</h1>
      <GalleryView items={gallery.items} />
    </>
  );
}
