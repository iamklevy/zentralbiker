import { getTranslations } from "next-intl/server";

import { getPathname } from "@/i18n/navigation";
import { mediaUrl } from "@/lib/media";
import { PRINT_TILTS } from "@/lib/print-path.mjs";

export type TravellerSlug = "alexandre" | "claudia";

/** The two travellers; each portrait was written by the other. */
export const TRAVELLERS: Record<
  TravellerSlug,
  { name: string; href: string; img: string; width: number; height: number; author: TravellerSlug }
> = {
  alexandre: {
    name: "Alexandre",
    href: "/alexandre",
    img: "images/wir/alex-segeln.jpg",
    width: 640,
    height: 853,
    author: "claudia",
  },
  claudia: {
    name: "Claudia",
    href: "/claudia",
    // her half of the New Zealand sailing diptych (Fotos › Neuseeland, no. 132)
    img: "images/wir/claudia-segeln.jpg",
    width: 477,
    height: 640,
    author: "alexandre",
  },
};

/**
 * A traveller's portrait page in the travel-diary style (see HomeJournal):
 * their photo set in as a print, their name, their motto set large, the
 * text, signed by the partner who wrote it, and a print of that partner.
 */
export async function PersonJournal({ slug, locale }: { slug: TravellerSlug; locale: string }) {
  const t = await getTranslations({ locale });
  const person = TRAVELLERS[slug];
  const author = TRAVELLERS[person.author];
  // raw: the texts carry apostrophes (wir's) that ICU would read as escapes
  const paragraphs = t.raw(`about.${slug}.paragraphs`) as string[];

  return (
    <div className="zb-journal">
      <div className="zb-journal-entry">
        <figure className="zb-journal-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(person.img)} alt={person.name} width={person.width} height={person.height} />
          <figcaption>{person.name}</figcaption>
        </figure>

        <div className="zb-journal-text">
          <p className="zb-journal-kicker">{t("nav.ueber_uns")}</p>
          <h1 className="zb-journal-name">{person.name}</h1>
          <blockquote className="zb-journal-quote">{t.raw(`about.${slug}.motto`)}</blockquote>
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="zb-journal-signature">{t("about.by", { name: author.name })}</p>
        </div>
      </div>

      <section className="zb-journal-legs" aria-labelledby="zb-travellers-title">
        <h2 id="zb-travellers-title" className="zb-journal-rule">
          <span>{t.raw("about.travellers")}</span>
        </h2>
        <ul className="zb-prints">
          <li>
            <a
              href={getPathname({ href: author.href, locale })}
              className="zb-print zb-print--labelled zb-print--leg zb-print--person"
              style={{ "--tilt": `${PRINT_TILTS[2]}deg` } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(author.img)} alt="" loading="lazy" decoding="async" />
              <span>
                <strong>{author.name}</strong>
                {t.raw("about.portrait")}
              </span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
