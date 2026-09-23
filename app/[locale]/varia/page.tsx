import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { SectionIndex } from "@/components/site/section-index";
import { SECTION_BANNERS } from "@/content/nav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "section.varia" });
  return { title: t("title"), description: t("lead") };
}

export default async function VariaIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <PageHero
        crumbs={[{ label: t("section.varia.title") }]}
        title={t("section.varia.title")}
        lead={t("section.varia.lead")}
        image={SECTION_BANNERS["/varia"]}
      />
      <Section>
        {/* The three rebuilt pages lead; the rest come from the migration. */}
        <SectionIndex
          section="varia"
          extra={[
            { href: "/varia/gaestebuch", title: t("guestbook.title"), note: t("guestbook.lead") },
            { href: "/varia/newsletter", title: t("newsletter.title"), note: t("newsletter.lead") },
            { href: "/varia/kontakt", title: t("contact.title"), note: t("contact.lead") },
          ]}
        />
      </Section>
    </>
  );
}
