import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { SiteChrome } from "@/components/site/site-chrome";
import { THEME_SCRIPT } from "@/lib/theme";
import { SITE_URL } from "@/lib/seo";
import "../globals.css";

// The labels on the photo prints (see .zb-print span), chosen for legibility.
const labelFont = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-label",
  display: "swap",
  // next/font has no metrics for this face, so it can't build an adjusted
  // fallback; globals.css falls back to Verdana instead.
  adjustFontFallback: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: { default: t("title"), template: `%s — Zentralbiker` },
    description: t("description"),
    metadataBase: new URL(SITE_URL),
    // No canonical/hreflang here: they must name the page itself, so each
    // page sets its own with pageAlternates (lib/seo.ts).
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "de" ? "de_CH" : "en_GB",
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // opts this tree into static rendering
  setRequestLocale(locale);

  return (
    // The theme script adds "dark" before React hydrates, hence the warning opt-out.
    <html lang={locale} className={labelFont.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* Browser extensions (Grammarly and the like) add attributes to <body>
          before React loads; they are not ours to match. */}
      <body suppressHydrationWarning>
        <NextIntlClientProvider>
          <SiteChrome>{children}</SiteChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
