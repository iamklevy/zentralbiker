import { getTranslations } from "next-intl/server";

import { getPathname } from "@/i18n/navigation";
import { mediaUrl } from "@/lib/media";
import { PRINT_TILTS } from "@/lib/print-path.mjs";
import { TRAVELLERS } from "@/components/site/person-journal";

/**
 * "Über uns" in the travel-diary style of the home page (see HomeJournal):
 * the two of them set in as a print beside the text, its opening sentence
 * set large, and a portrait print of each leading to their own page.
 */
export async function AboutJournal({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  // raw: the texts carry apostrophes (3'000) that ICU would read as escapes
  const paragraphs = t.raw("about.paragraphs") as string[];

  return (
    <div className="zb-journal">
      <div className="zb-journal-entry zb-journal-entry--wide">
        <figure className="zb-journal-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl("images/wir/alex_claudia_3.jpg")} alt={t.raw("about.photo")} width={425} height={319} />
          <figcaption>{t.raw("about.photo")}</figcaption>
        </figure>

        <div className="zb-journal-text">
          <p className="zb-journal-kicker">{t("nav.ueber_uns")}</p>
          <p className="zb-journal-lead">{t.raw("about.lead")}</p>
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>

      <section className="zb-journal-legs" aria-labelledby="zb-travellers-title">
        <h2 id="zb-travellers-title" className="zb-journal-rule">
          <span>{t.raw("about.travellers")}</span>
        </h2>
        <ul className="zb-prints">
          {Object.values(TRAVELLERS).map((p, i) => (
            <li key={p.href}>
              <a
                href={getPathname({ href: p.href, locale })}
                className="zb-print zb-print--labelled zb-print--leg zb-print--person"
                style={{ "--tilt": `${PRINT_TILTS[(i + 1) % PRINT_TILTS.length]}deg` } as React.CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(p.img)} alt="" loading="lazy" decoding="async" />
                <span>
                  <strong>{p.name}</strong>
                  {t.raw("about.portrait")}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
