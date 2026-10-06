import { getTranslations } from "next-intl/server";

import { getPathname } from "@/i18n/navigation";
import { LEGS, localName } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import { PRINT_TILTS, printPath } from "@/lib/print-path.mjs";

/** One photo per leg, from its highlights gallery. */
export const LEG_PHOTOS: Record<string, string> = {
  amerika: "4fotos/images_highlights_amerika/002 Altiplano - Peru.JPG",
  asien: "4fotos/images_highlights_asien/019 Pamir Highway - Tajikistan.JPG",
  ozeanien: "4fotos/images_highlights_ozeanien/009 Patagonien - Chile.jpg",
};

/**
 * The home page as a page from a travel diary: the lighthouse taped in as a
 * photo print beside the essay, the motto as a sign-off, and the three legs
 * of the trip as prints leading to their reports.
 */
export async function HomeJournal({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const paragraphs = t.raw("home.paragraphs") as string[];

  return (
    <div className="zb-journal">
      <div className="zb-journal-entry">
        <figure className="zb-journal-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl("images/wir/Leuchtturm.jpg")} alt={t("home.photo")} width={319} height={425} />
          <figcaption>{t("home.photo")}</figcaption>
        </figure>

        <div className="zb-journal-text">
          <blockquote className="zb-journal-quote">{t("home.quote")}</blockquote>
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* In the text column, so it centres under the paragraphs rather
            than across the photo as well. */}
        <p className="zb-journal-motto">{t("home.motto")}</p>
      </div>

      <section className="zb-journal-legs" aria-labelledby="zb-legs-title">
        <h2 id="zb-legs-title" className="zb-journal-rule">
          <span>{t("home.legs_title")}</span>
        </h2>
        <ul className="zb-prints">
          {LEGS.map((leg, i) => (
            <li key={leg.slug}>
              <a
                href={getPathname({ href: `/berichte/${leg.slug}`, locale })}
                className="zb-print zb-print--labelled zb-print--leg"
                style={{ "--tilt": `${PRINT_TILTS[i % PRINT_TILTS.length]}deg` } as React.CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(printPath(LEG_PHOTOS[leg.slug]))} alt="" loading="lazy" decoding="async" />
                <span>
                  <strong>{localName(leg.slug, leg.name, locale)}</strong>
                  {t("leg.countries", { count: leg.countries.length })}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
