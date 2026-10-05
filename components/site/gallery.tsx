"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import type { GalleryItem } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import { PRINT_TILTS, printPath } from "@/lib/print-path.mjs";

/**
 * The photos as loose prints on the page (see `.zb-prints` in
 * app/globals.css), opening into a slide projector: the full photo in a dark
 * room, arrow keys / swipe / a filmstrip of the gallery to move around.
 *
 * The prints are 360px versions made by scripts/build-prints.mjs; the full
 * photo only loads once the projector is on it.
 */
export function Gallery({ items }: { items: GalleryItem[] }) {
  const t = useTranslations();
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpen((i) => (i === null ? null : (i + delta + items.length) % items.length)),
    [items.length],
  );

  if (!items.length) {
    return <p>{t("gallery.empty")}</p>;
  }

  return (
    <>
      <ul className="zb-prints">
        {items.map((item, i) => (
          <li key={item.src}>
            <button
              type="button"
              className="zb-print"
              style={{ "--tilt": `${PRINT_TILTS[i % PRINT_TILTS.length]}deg` } as React.CSSProperties}
              onClick={() => setOpen(i)}
              aria-label={`${t("gallery.open")} ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(printPath(item.src))} alt="" loading="lazy" decoding="async" />
              <span aria-hidden>{i + 1}</span>
            </button>
          </li>
        ))}
      </ul>

      {open !== null && <Projector items={items} index={open} onSelect={setOpen} onStep={step} onClose={close} />}
    </>
  );
}

/** A slide in the projector: a photo, or (on the film pages) a video. */
export type Slide = GalleryItem & { video?: boolean };

export function Projector({
  items,
  index,
  onSelect,
  onStep,
  onClose,
}: {
  items: Slide[];
  index: number;
  onSelect: (i: number) => void;
  onStep: (delta: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations();
  const strip = useRef<HTMLUListElement>(null);
  const touchX = useRef<number | null>(null);

  // Keyboard control, and lock body scroll so the page behind stays put.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // the arrow keys seek inside a focused video, so leave them to it
      if (e.target instanceof HTMLVideoElement && e.key !== "Escape") return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onStep(1);
      else if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onStep]);

  // Keep the current frame in view on the filmstrip, and have the
  // neighbouring slides loaded before they are asked for.
  useEffect(() => {
    strip.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    for (const d of [1, -1]) {
      const next = items[(index + d + items.length) % items.length];
      if (!next.video) new Image().src = mediaUrl(next.src);
    }
  }, [index, items]);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="zb-projector"
      onClick={onClose}
      // a swipe on the video is its own scrubbing, not a change of slide
      onTouchStart={(e) => (touchX.current = e.target instanceof HTMLVideoElement ? null : e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) onStep(dx < 0 ? 1 : -1);
      }}
    >
      <button type="button" onClick={onClose} className="zb-projector-close">
        <X className="size-5" aria-hidden />
        {t("gallery.close")}
      </button>

      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label={t("gallery.prev")}
            onClick={(e) => {
              stop(e);
              onStep(-1);
            }}
            className="zb-projector-btn start-2 top-1/2 -translate-y-1/2"
          >
            <ChevronLeft className="size-7" />
          </button>
          <button
            type="button"
            aria-label={t("gallery.next")}
            onClick={(e) => {
              stop(e);
              onStep(1);
            }}
            className="zb-projector-btn end-2 top-1/2 -translate-y-1/2"
          >
            <ChevronRight className="size-7" />
          </button>
        </>
      )}

      <div className="zb-projector-stage">
        {/* Keyed on the slide so each one comes up with the lamp fade. */}
        {items[index].video ? (
          <video
            key={items[index].src}
            src={mediaUrl(items[index].src)}
            poster={mediaUrl(items[index].thumb)}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onClick={stop}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={items[index].src} src={mediaUrl(items[index].src)} alt="" onClick={stop} />
        )}
      </div>

      <p className="zb-projector-counter" aria-live="polite">
        {t("gallery.counter", { current: index + 1, total: items.length })}
      </p>

      {items.length > 1 && (
        <ul className="zb-filmstrip" ref={strip} onClick={stop}>
          {items.map((item, i) => (
            <li key={item.src}>
              <button
                type="button"
                aria-current={i === index}
                aria-label={`${t("gallery.open")} ${i + 1}`}
                onClick={() => onSelect(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(item.thumb)} alt="" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
