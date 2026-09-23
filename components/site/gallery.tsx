"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import type { GalleryItem } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * Thumbnail grid + lightbox.
 *
 * The originals are 2–4 MP camera files, so the grid never loads them: it
 * renders the gallery's own thumbnail (~17 KB) and only fetches the full
 * image once the lightbox opens. Next/Image is given `unoptimized` for the
 * full view because these are already-compressed JPEGs served from /media —
 * re-encoding 4,000 of them at build time would be pointless work.
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

  // Keyboard control while the lightbox is open, and lock body scroll so the
  // page behind does not move under the overlay.
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, step]);

  if (!items.length) {
    return <p className="text-muted">{t("gallery.empty")}</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.src}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={t("gallery.open")}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-stone focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Image
                src={`/media/${item.thumb}`}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label={t("gallery.close")}
            className="absolute end-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-paper/10 text-paper hover:bg-paper/20"
          >
            <X className="size-5" />
          </button>

          {items.length > 1 && (
            <>
              <NavButton side="start" label={t("gallery.prev")} onClick={() => step(-1)}>
                <ChevronLeft className="size-6" />
              </NavButton>
              <NavButton side="end" label={t("gallery.next")} onClick={() => step(1)}>
                <ChevronRight className="size-6" />
              </NavButton>
            </>
          )}

          {/* Stop the backdrop handler firing when the image itself is clicked. */}
          <figure
            className="relative flex max-h-full max-w-[min(1400px,92vw)] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${items[open].src}`}
              alt=""
              className="max-h-[82vh] w-auto rounded-lg object-contain shadow-deep"
            />
            <figcaption className="mt-3 text-[0.9rem] text-paper/70">
              {t("gallery.counter", { current: open + 1, total: items.length })}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}

function NavButton({
  side,
  label,
  onClick,
  children,
}: {
  side: "start" | "end";
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-paper/10 text-paper hover:bg-paper/20",
        side === "start" ? "start-3" : "end-3",
      )}
    >
      {children}
    </button>
  );
}
