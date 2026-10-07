import { getTranslations } from "next-intl/server";
import { parse } from "node-html-parser";
import { ArrowRight } from "lucide-react";

import { getPathname } from "@/i18n/navigation";
import { getPage, LEGS, localName } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import { printPath } from "@/lib/print-path.mjs";
import { LEG_PHOTOS } from "@/components/site/home-journal";

/**
 * Each leg's introduction from the old overview page, which pairs a link to
 * the leg with a paragraph about it: { amerika: "Amerige, das Land …", … }.
 */
function legIntros(locale: string): Record<string, string> {
  const page = getPage("/berichte", locale);
  if (!page) return {};
  const intros: Record<string, string> = {};
  for (const link of parse(page.html).querySelectorAll('a[href^="/berichte/"]')) {
    const slug = link.getAttribute("href")!.split("/")[2];
    const text = link.parentNode?.nextElementSibling?.text.replace(/\s+/g, " ").trim();
    if (slug && text) intros[slug] = text;
  }
  return intros;
}

/**
 * "Berichte" as a travel diary, like Home and the portraits: each leg of the
 * journey is an entry with its photo set in on the left and, beside it,
 * what the leg was about, every country it crossed, and the way into its
 * report.
 */
export async function ReportsOverview({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const intros = legIntros(locale);
  const countries = LEGS.reduce((n, leg) => n + leg.countries.length, 0);

  return (
    <div className="zb-journal zb-reports">
      <header className="zb-reports-head">
        <p className="zb-journal-kicker">
          {LEGS.length} {t("home.stats.legs")} · {countries} {t("home.stats.countries")}
        </p>
        <h1 className="zb-journal-name">{t("section.berichte.title")}</h1>
        <p className="zb-reports-lead">{t("section.berichte.lead")}</p>
      </header>

      {LEGS.map((leg) => {
        const name = localName(leg.slug, leg.name, locale);
        const href = getPathname({ href: `/berichte/${leg.slug}`, locale });
        return (
          <article key={leg.slug} id={leg.slug} className="zb-journal-entry zb-reports-leg">
            <figure className="zb-journal-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(printPath(LEG_PHOTOS[leg.slug]))} alt="" loading="lazy" decoding="async" />
              <figcaption>{name}</figcaption>
            </figure>

            <div className="zb-journal-text">
              <p className="zb-journal-kicker">{t("leg.countries", { count: leg.countries.length })}</p>
              <h2 className="zb-reports-title">
                <a href={href}>{name}</a>
              </h2>
              {intros[leg.slug] && <p>{intros[leg.slug]}</p>}

              <ul className="zb-reports-countries">
                {leg.countries.map((c) => (
                  <li key={c.slug}>
                    <a href={getPathname({ href: c.path, locale })}>{localName(c.slug, c.name, locale)}</a>
                  </li>
                ))}
              </ul>

              <a href={href} className="zb-reports-more">
                {t("leg.read")}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
