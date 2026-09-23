import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Prose } from "@/components/site/prose";
import { SectionIndex } from "@/components/site/section-index";
import { getPage } from "@/lib/content";
import { SECTION_BANNERS } from "@/content/nav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "section.ausruestung" });
  return { title: t("title"), description: t("lead") };
}

export default async function AusruestungIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const intro = getPage("/ausruestung");

  return (
    <>
      <PageHero
        crumbs={[{ label: t("section.ausruestung.title") }]}
        title={t("section.ausruestung.title")}
        lead={t("section.ausruestung.lead")}
        image={SECTION_BANNERS["/ausruestung"]}
      />

      {intro?.html && intro.words > 20 && (
        <Section>
          <Prose html={intro.html} className="max-w-[68ch]" />
        </Section>
      )}

      <Section tint={Boolean(intro?.html && intro.words > 20)}>
        <SectionIndex section="ausruestung" />
      </Section>
    </>
  );
}
