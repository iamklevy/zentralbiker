import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Prose } from "@/components/site/prose";
import { Stagger, StaggerItem } from "@/components/site/motion";
import { LEGS, getPage } from "@/lib/content";
import { SECTION_BANNERS } from "@/content/nav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "section.route" });
  return { title: t("title"), description: t("lead") };
}

export default async function RouteIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const overview = getPage("/route");

  return (
    <>
      <PageHero
        crumbs={[{ label: t("section.route.title") }]}
        title={t("section.route.title")}
        lead={t("section.route.lead")}
        image={SECTION_BANNERS["/route"]}
      />

      {/* The old overview page was three route maps and little else — those
          images come through the migrated body as-is. */}
      {overview?.html && (
        <Section>
          <Prose html={overview.html} />
        </Section>
      )}

      {LEGS.map((leg) => (
        <Section key={leg.slug} tint={leg.order % 2 === 1}>
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[clamp(1.4rem,1.1rem+1.2vw,2rem)]">
              <Link href={`/route/${leg.slug}`} className="hover:text-accent-2">
                {leg.name}
              </Link>
            </h2>
            <p className="text-[0.9rem] text-muted">
              {t("leg.countries", { count: leg.countries.length })}
            </p>
          </div>

          <Stagger className="flex flex-wrap gap-2">
            {leg.countries
              .filter((c) => c.route)
              .map((country) => (
                <StaggerItem key={country.slug}>
                  <Link
                    href={`/route/${country.slug}`}
                    className="inline-flex rounded-full border border-line bg-paper px-4 py-2 text-[0.94rem] text-ink-2 shadow-soft transition-colors hover:border-accent hover:text-accent-2"
                  >
                    {country.name}
                  </Link>
                </StaggerItem>
              ))}
          </Stagger>
        </Section>
      ))}
    </>
  );
}
