"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";

import type { GalleryItem } from "@/lib/content";
import { HIGHLIGHT_MIXES } from "@/lib/highlights";
import { mediaUrl } from "@/lib/media";

/**
 * A leg's highlights as a slideshow over its music mix, as on the old site
 * (which faded through the photos over an autoplaying mix).
 *
 * The music is the clock: while it plays, the photo on screen is worked out
 * from how far into the mix it is, so the two cannot drift apart (if the
 * audio stalls to buffer, the photos wait with it). Each photo gets an equal
 * share of the mix, so the show and the music end together. With the music
 * off, a timer keeps the same pace, and turning it back on picks up at the
 * photo on screen. Stepping back or forward moves the music along too.
 *
 * Both start with the page. Browsers refuse sound before the reader has
 * interacted with the page, so if the music is refused it starts, in step,
 * on the first tap, click or key press, unless the reader switched it off.
 */
/** "4fotos/…/006 Abkühlung - Costa Rica.JPG" -> "Abkühlung – Costa Rica". */
function caption(src: string): string {
  const name = (src.split("/").pop() ?? "")
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[a-z]?\s+/i, "")
    .replace(/_/g, " ")
    .trim();
  // the title cards ("Ozeanien_Intro_Bild") carry their own lettering
  return /\bintro\b/i.test(name) ? "" : name.replace(/ - /g, " – ");
}

/** Events that count as the reader interacting, which lets sound start. */
const ACTIVATION = ["pointerup", "touchend", "keydown", "click"] as const;

// Full screen isn't offered where the browser can't do it (iPhone Safari).
const noSubscribe = () => () => {};
const fullscreenEnabled = () => Boolean(document.fullscreenEnabled);

export function HighlightsShow({ slug, items }: { slug: string; items: GalleryItem[] }) {
  const t = useTranslations("show");
  const mix = HIGHLIGHT_MIXES[slug];
  const count = items.length;

  const root = useRef<HTMLElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const touchX = useRef<number | null>(null);

  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [running, setRunning] = useState(true);
  const [musicOn, setMusicOn] = useState(true); // what the reader wants
  const [audible, setAudible] = useState(false); // whether it is playing
  const [full, setFull] = useState(false);
  const canFull = useSyncExternalStore(noSubscribe, fullscreenEnabled, () => false);

  // Refs mirror what the timer and the event listeners read.
  const clock = useRef(0); // seconds into the show
  const length = useRef(mix?.duration ?? 0);
  const indexRef = useRef(0);
  const runningRef = useRef(true);
  const musicOnRef = useRef(true);
  useEffect(() => {
    runningRef.current = running;
    musicOnRef.current = musicOn;
  }, [running, musicOn]);

  const show = useCallback((i: number) => {
    if (i === indexRef.current) return;
    setPrev(indexRef.current);
    indexRef.current = i;
    setIndex(i);
  }, []);

  const startMusic = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = clock.current;
    el.play().catch(() => setAudible(false));
  }, []);

  // The clock: the music's position while it plays, a timer otherwise.
  useEffect(() => {
    if (!mix || !count) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (!runningRef.current) return;
      const el = audio.current;
      if (el && !el.paused) clock.current = el.currentTime;
      else clock.current = (clock.current + dt) % length.current;
      show(Math.floor(clock.current / (length.current / count)) % count);
    }, 200);
    return () => window.clearInterval(id);
  }, [mix, count, show]);

  // Music with the page, or with the first interaction if it was refused.
  useEffect(() => {
    if (!mix) return;
    startMusic();
    const el = audio.current;
    const kick = (e: Event) => {
      // the music button decides for itself
      if (e.target instanceof Element && e.target.closest(".zb-show-music")) return;
      if (musicOnRef.current && runningRef.current && el?.paused) startMusic();
    };
    for (const type of ACTIVATION) window.addEventListener(type, kick, true);
    return () => {
      for (const type of ACTIVATION) window.removeEventListener(type, kick, true);
      el?.pause(); // leaving the page stops the music
    };
  }, [mix, startMusic]);

  // Have the next photo loaded before it is due.
  useEffect(() => {
    if (count > 1) new Image().src = mediaUrl(items[(index + 1) % count].src);
  }, [index, count, items]);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!mix || !count) return null;

  /** Jump to a photo; the music jumps with it. */
  function go(i: number) {
    const target = (i + count) % count;
    clock.current = target * (length.current / count) + 0.05;
    const el = audio.current;
    if (el && !el.paused) el.currentTime = clock.current;
    show(target);
  }

  function toggleRunning() {
    if (running) {
      setRunning(false);
      audio.current?.pause();
    } else {
      setRunning(true);
      if (musicOn) startMusic();
    }
  }

  function toggleMusic() {
    if (audible) {
      setMusicOn(false);
      audio.current?.pause();
    } else {
      setMusicOn(true);
      if (running) startMusic();
    }
  }

  function toggleFull() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen();
  }

  const label = caption(items[index].src);
  const waitingForTap = musicOn && running && !audible;

  return (
    <section
      ref={root}
      className="zb-show"
      aria-roledescription="carousel"
      aria-label={t("label")}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(indexRef.current + 1);
        else if (e.key === "ArrowLeft") go(indexRef.current - 1);
        else if (e.key === " " && e.target === e.currentTarget) {
          e.preventDefault();
          toggleRunning();
        }
      }}
    >
      <audio
        ref={audio}
        src={mediaUrl(mix.file)}
        preload="auto"
        loop
        onPlay={() => setAudible(true)}
        onPause={() => setAudible(false)}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration)) length.current = e.currentTarget.duration;
        }}
      />

      <div
        className="zb-show-stage"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(indexRef.current + (dx < 0 ? 1 : -1));
        }}
      >
        {/* The last photo stays underneath while the new one fades in over it. */}
        {prev !== null && prev !== index && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`under-${items[prev].src}`} className="zb-show-img is-under" src={mediaUrl(items[prev].src)} alt="" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={items[index].src} className="zb-show-img" src={mediaUrl(items[index].src)} alt={label} />
      </div>

      <div className="zb-show-bar">
        <p className="zb-show-caption" aria-live={running ? "off" : "polite"}>
          {label}
        </p>
        <span className="zb-show-count">{t("counter", { current: index + 1, total: count })}</span>
        <div className="zb-show-buttons">
          <button type="button" onClick={() => go(indexRef.current - 1)} aria-label={t("prev")} title={t("prev")}>
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={toggleRunning}
            aria-label={running ? t("pause") : t("play")}
            title={running ? t("pause") : t("play")}
          >
            {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          </button>
          <button type="button" onClick={() => go(indexRef.current + 1)} aria-label={t("next")} title={t("next")}>
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            className="zb-show-music"
            onClick={toggleMusic}
            aria-pressed={audible}
            aria-label={audible ? t("musicOff") : t("musicOn")}
            title={audible ? t("musicOff") : t("musicOn")}
          >
            {audible ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
            {waitingForTap && <span>{t("tapForMusic")}</span>}
          </button>
          {canFull && (
            <button
              type="button"
              onClick={toggleFull}
              aria-label={full ? t("exitFullscreen") : t("fullscreen")}
              title={full ? t("exitFullscreen") : t("fullscreen")}
            >
              {full ? <Minimize className="size-4" aria-hidden /> : <Maximize className="size-4" aria-hidden />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
