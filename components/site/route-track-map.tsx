"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

import type { DayInfo, Track } from "@/lib/route";

/** The words of the info box, in the page's language. */
export interface TrackMapLabels {
  all: string;
  title: string;
  distance: string;
  duration: string;
  moving: string;
  speed: string;
  up: string;
  down: string;
  height: string;
  hint: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const hm = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")} h`;

/** The info box of one day: what the old map showed on a click. */
function infoHtml(info: DayInfo, section: string, labels: TrackMapLabels, locale: string) {
  const number = (n: number) => n.toLocaleString(locale === "de" ? "de-CH" : "en-GB").replace(/’/g, "'");
  const rows: [string, string | undefined][] = [
    [labels.distance, `${number(info.km)} km`],
    [labels.moving, info.moving ? hm(info.moving) : undefined],
    [labels.duration, info.duration ? hm(info.duration) : undefined],
    [labels.speed, info.speed ? `${number(info.speed)} km/h` : undefined],
    [labels.up, info.up !== undefined ? `${number(info.up)} m` : undefined],
    [labels.down, info.down !== undefined ? `${number(info.down)} m` : undefined],
    [labels.height, info.min !== undefined ? `${number(info.min)} – ${number(info.max!)} m` : undefined],
  ];
  const date = info.date
    ? new Date(`${info.date}T12:00:00Z`).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
  return `<div class="zb-day">
    ${section ? `<p class="zb-day-section">${esc(section)}</p>` : ""}
    ${date ? `<p class="zb-day-date">${esc(date)}</p>` : ""}
    <dl>${rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v!)}</dd></div>`)
      .join("")}</dl>
  </div>`;
}

/**
 * The GPS tracks of a country on an OpenStreetMap map, as the old route pages
 * had them: the mouse wheel zooms, every day of riding is its own line, and
 * clicking one opens its figures (date, distance, time, speed, climb,
 * heights). With several sections (Chile, New Zealand, China) a row of
 * buttons shows one at a time or all of them.
 *
 * Leaflet only runs in the browser, so it is loaded when the map mounts.
 */
export function RouteTrackMap({ tracks, labels, locale }: { tracks: Track[]; labels: TrackMapLabels; locale: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<number | null>(null); // null: all
  const draw = useRef<((index: number | null) => void) | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !box.current) return;
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "#d90000";
      map = L.map(box.current);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const layer = L.layerGroup().addTo(map);
      const dot = (at: [number, number], fill: string) =>
        L.circleMarker(at, { radius: 7, weight: 3, color: "#ffffff", fillColor: fill, fillOpacity: 1, interactive: false });
      const normal = { color: accent, weight: 4, opacity: 0.85 };
      const lit = { color: "#7a0000", weight: 7, opacity: 1 };
      let picked: import("leaflet").Polyline | null = null;

      draw.current = (index) => {
        layer.clearLayers();
        map!.closePopup();
        picked = null;
        const sections = index === null ? tracks.map((t, i) => [t, i] as const) : [[tracks[index], index] as const];
        const all: [number, number][] = [];
        for (const [track] of sections) {
          track.lines.forEach((line, d) => {
            all.push(...line);
            // the line you see ignores the mouse: raised on hover it would
            // otherwise cover its hit twin and swallow the click
            const day = L.polyline(line, { ...normal, interactive: false }).addTo(layer);
            // a wide invisible twin makes the thin line easy to hit
            const hit = L.polyline(line, { opacity: 0, weight: 18 }).addTo(layer);
            const light = (on: boolean) => {
              if (day !== picked) day.setStyle(on ? lit : normal);
              if (on) day.bringToFront();
            };
            hit.on("mouseover", () => light(true));
            hit.on("mouseout", () => light(false));
            hit.on("click", (e) => {
              picked?.setStyle(normal);
              picked = day.setStyle(lit);
              L.popup({ maxWidth: 280, className: "zb-day-popup" })
                .setLatLng(e.latlng)
                .setContent(infoHtml(track.info[d] ?? { km: 0 }, tracks.length > 1 ? track.label : "", labels, locale))
                .openOn(map!);
            });
          });
        }
        if (!all.length) return;
        const first = sections[0][0].lines[0];
        const lastTrack = sections[sections.length - 1][0];
        const lastLine = lastTrack.lines[lastTrack.lines.length - 1];
        dot(first[0], "#1f9d55").addTo(layer);
        dot(lastLine[lastLine.length - 1], accent).addTo(layer);
        map!.fitBounds(L.latLngBounds(all), { padding: [24, 24] });
      };
      map.on("popupclose", () => {
        picked?.setStyle(normal);
        picked = null;
      });
      draw.current(null);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [tracks, labels, locale]);

  useEffect(() => {
    draw.current?.(shown);
  }, [shown]);

  return (
    <div className="zb-track">
      {tracks.length > 1 && (
        <div className="zb-track-pick" role="group" aria-label={labels.title}>
          <button type="button" aria-pressed={shown === null} onClick={() => setShown(null)}>
            {labels.all}
          </button>
          {tracks.map((t, i) => (
            <button key={i} type="button" aria-pressed={shown === i} onClick={() => setShown(i)}>
              {t.label || i + 1}
            </button>
          ))}
        </div>
      )}
      <p className="zb-track-hint">{labels.hint}</p>
      <div ref={box} className="zb-track-map" role="region" aria-label={labels.title} />
    </div>
  );
}
