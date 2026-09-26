import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "14. März 2011" / "14 March 2011" / "14 mars 2011" */
export function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(
    locale === "de" ? "de-CH" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  ).format(d);
}

/** Swiss-style thousands separator: 16'000 km. */
export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-CH").format(n);
}
