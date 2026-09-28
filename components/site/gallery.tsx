"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import type { GalleryItem } from "@/lib/content";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";

/**
 * Thumbnail grid + lightbox, as the original galleries had them: small
 * thumbnails at their own size (120x90, or 90x120 upright), five to a
 * 720px row in 120px cells, opening the full photo over a black overlay.
 * The thumbnails are deliberately NOT enlarged — the full image only loads
 * once the lightbox opens.
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
    return <p>{t("gallery.empty")}</p>;
  }

  return (
    <>
      <ul className="zb-thumbs">
        {items.map((item, i) => (
          <li key={item.src}>
            <button type="button" onClick={() => setOpen(i)} aria-label={t("gallery.open")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(item.thumb)} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label={t("gallery.close")}
            className="absolute end-4 top-4 z-10 grid size-11 place-items-center text-[#ccc] hover:text-white"
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
              src={mediaUrl(items[open].src)}
              alt=""
              className="max-h-[82vh] w-auto border-4 border-[#666] object-contain"
            />
            <figcaption className="mt-3 text-[12px] text-[#ccc]">
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
        "absolute top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center text-[#ccc] hover:text-white",
        side === "start" ? "start-3" : "end-3",
      )}
    >
      {children}
    </button>
  );
}
