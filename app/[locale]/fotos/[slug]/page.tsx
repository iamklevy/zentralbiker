import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { ContentPage } from "@/components/site/content-page";
import { Gallery as GalleryView } from "@/components/site/gallery";
import { ALL_GALLERIES, FOTO_OVERVIEWS, getGallery, getPage } from "@/lib/content";

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const gallery = getGallery(slug);
  return gallery ? { title: gallery.name } : {};
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const gallery = slug === "galeriebilder" ? null : getGallery(slug);
  if (!gallery) {
    if (!getPage(`/fotos/${slug}`)) notFound();
    return <ContentPage path={`/fotos/${slug}`} locale={locale} />;
  }

  return (
    <>
      <h1>{gallery.name}</h1>
      <GalleryView items={gallery.items} />
    </>
  );
}
