"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { Projector, type Slide } from "@/components/site/gallery";
import { mediaUrl } from "@/lib/media";
import { PRINT_TILTS } from "@/lib/print-path.mjs";

export interface FilmSection {
  heading: string;
  films: (Slide & { label: string })[];
}

/**
 * The film pages (Filme Asien, …): each film as a piece of film strip with
 * its name on a white label, playing in the same projector as the photos.
 * All films on the page form one reel, so the arrows run across sections.
 */
export function FilmPrints({ sections }: { sections: FilmSection[] }) {
  const t = useTranslations();
  const reel = sections.flatMap((s) => s.films);
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) => setOpen((i) => (i === null ? null : (i + delta + reel.length) % reel.length)),
    [reel.length],
  );

  let n = 0;
  return (
    <>
      {sections.map((section, s) => (
        <section key={s}>
          {section.heading && <h2 className="zb-overview-heading">{section.heading}</h2>}
          <ul className="zb-prints">
            {section.films.map((film) => {
              const i = n++;
              return (
                <li key={film.src}>
                  <button
                    type="button"
                    className="zb-print zb-print--labelled zb-print--film"
                    style={{ "--tilt": `${PRINT_TILTS[i % PRINT_TILTS.length]}deg` } as React.CSSProperties}
                    onClick={() => setOpen(i)}
                    aria-label={`${t("gallery.play")}: ${film.label}`}
                  >
                    <span className="zb-film">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(film.thumb)} alt="" width={160} height={90} loading="lazy" decoding="async" />
                    </span>
                    <span>{film.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {open !== null && <Projector items={reel} index={open} onSelect={setOpen} onStep={step} onClose={close} />}
    </>
  );
}
