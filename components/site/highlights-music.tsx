"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";

import { mediaUrl } from "@/lib/media";

/**
 * The music mix that played over each leg's highlights slideshow on the old
 * site (an autoplaying jQuery player). Here it waits for the reader to press
 * play: browsers block sound before a click anyway, and a 20-minute, 30 MB
 * mix should not start downloading on every visit (hence preload="none").
 */
const MIXES: Record<string, { file: string; duration: number }> = {
  "highlights-amerika": { file: "4fotos/audios/amerika_mix.mp3", duration: 1260 },
  "highlights-asien": { file: "4fotos/audios2/asien_mix.mp3", duration: 1158 },
  "highlights-ozeanien": { file: "4fotos/audios3/ozeanien_mix.mp3", duration: 1212 },
};

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function HighlightsMusic({ slug }: { slug: string }) {
  const t = useTranslations("music");
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const mix = MIXES[slug];
  const [duration, setDuration] = useState(mix?.duration ?? 0);

  // Leaving the page must stop the music.
  useEffect(() => {
    const el = audio.current;
    return () => el?.pause();
  }, []);

  if (!mix) return null;

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }

  return (
    <div className="zb-music" role="group" aria-label={t("label")}>
      <audio
        ref={audio}
        src={mediaUrl(mix.file)}
        preload="none"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
      />
      <button
        type="button"
        className="zb-music-toggle"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? t("pause") : t("play")}
        title={playing ? t("pause") : t("play")}
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      </button>
      <span className="zb-music-label">{t("label")}</span>
      <input
        type="range"
        className="zb-music-seek"
        min={0}
        max={duration}
        step={1}
        value={Math.min(time, duration)}
        onChange={(e) => {
          const el = audio.current;
          if (el) el.currentTime = Number(e.currentTarget.value);
          setTime(Number(e.currentTarget.value));
        }}
        aria-label={t("seek")}
        aria-valuetext={`${clock(time)} / ${clock(duration)}`}
      />
      <span className="zb-music-time">
        {clock(time)} / {clock(duration)}
      </span>
    </div>
  );
}
