import { ArrowRight, Bike, BookOpen, Camera, Map } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Section, SectionHead, Wrap } from "@/components/site/section";
import { Prose } from "@/components/site/prose";
import { Reveal, Stagger, StaggerItem } from "@/components/site/motion";
import { Button } from "@/components/ui/button";
import { getPage, LEGS, SITE_STATS, getGalleryByDir } from "@/lib/content";
import { formatNumber } from "@/lib/utils";
import { SECTION_BANNERS } from "@/content/nav";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const intro = getPage("/");
  const stats = [
    { icon: Map, value: SITE_STATS.countries, label: t("home.stats.countries") },
    { icon: BookOpen, value: SITE_STATS.reports, label: t("home.stats.reports") },
    { icon: Camera, value: SITE_STATS.photos, label: t("home.stats.photos") },
    { icon: Bike, value: SITE_STATS.legs, label: t("home.stats.legs") },
  ];

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SECTION_BANNERS["/"]} alt="" className="h-[46vh] min-h-[280px] w-full object-cover md:h-[56vh]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />

        <Wrap className="absolute inset-x-0 bottom-0">
          <Reveal>
            <div className="max-w-[24ch] pb-8 md:pb-12">
              <p className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-accent">
                {t("home.lead")}
              </p>
              <h1 className="mt-3 text-paper text-[clamp(2.1rem,1.4rem+3.6vw,4rem)] [text-shadow:0_2px_16px_rgb(0_0_0_/_0.4)]">
                {t("home.title")}
              </h1>
            </div>
          </Reveal>
        </Wrap>
      </section>

      {/* ------------------------------------------------------ stats bar */}
      <section className="border-b border-line bg-paper-2">
        <Wrap className="py-8 md:py-10">
          <Reveal>
            <dl className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-card border border-line bg-paper p-4 shadow-soft">
                  <Icon className="size-5 text-accent" />
                  <dd className="mt-2 font-display text-[1.75rem] font-semibold leading-none">
                    {formatNumber(value, locale)}
                  </dd>
                  <dt className="mt-1 text-[0.87rem] text-muted">{label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </Wrap>
      </section>

      {/* ------------------------------------------- migrated intro essay */}
      {intro?.html && (
        <Section>
          <Reveal>
            <Prose html={intro.html} className="max-w-[68ch]" />
          </Reveal>
        </Section>
      )}

      {/* ---------------------------------------------------------- legs */}
      <Section tint>
        <SectionHead
          eyebrow={t("nav.berichte")}
          title={t("home.legs_title")}
          lead={t("home.legs_lead")}
          action={
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/berichte">
                {t("home.explore")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />

        <Stagger className="grid gap-5 md:grid-cols-3">
          {LEGS.map((leg) => {
            // Use the first country gallery in the leg as its cover image.
            const cover = leg.countries
              .map((c) => getGalleryByDir(c.galleryDir))
              .find((g) => g && g.items.length);
            return (
              <StaggerItem key={leg.slug}>
                <Link
                  href={`/berichte/${leg.slug}`}
                  className="group block overflow-hidden rounded-card border border-line bg-paper shadow-soft transition-shadow hover:shadow-lift"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-stone">
                    {cover && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/media/${cover.items[0].src}`}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-[1.3rem]">{leg.name}</h3>
                    <p className="mt-1 text-[0.9rem] text-muted">
                      {t("leg.countries", { count: leg.countries.length })}
                    </p>
                    <p className="mt-3 line-clamp-2 text-[0.92rem] text-muted">
                      {leg.countries.map((c) => c.name).join(" · ")}
                    </p>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Section>

      {/* ---------------------------------------------------------- gear */}
      <Section>
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl2 border border-line bg-paper-2 p-7 md:p-10">
          <div className="max-w-[46ch]">
            <h2 className="text-[clamp(1.4rem,1.1rem+1.4vw,2rem)]">{t("home.gear_title")}</h2>
            <p className="mt-2 text-muted">{t("home.gear_lead")}</p>
          </div>
          <Button asChild className="rounded-full bg-accent hover:bg-accent-2">
            <Link href="/ausruestung">
              {t("home.gear_cta")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
