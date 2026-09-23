"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Off-screen honeypot field.
 *
 * Kept out of view with a clip rect rather than `display:none`, because the
 * simplest bots skip hidden inputs but happily fill a visible-to-the-DOM one.
 * `tabIndex={-1}` and `aria-hidden` keep it away from keyboard and screen
 * reader users, and autocomplete is disabled so browsers never fill it in.
 */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute size-px overflow-hidden [clip:rect(0,0,0,0)]">
      <label htmlFor="website">Website</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

/** Inline success/error line, announced to assistive tech when it appears. */
export function FormMessage({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  const Icon = state.ok ? CheckCircle2 : AlertCircle;
  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 text-[0.92rem] ${state.ok ? "text-pine" : "text-danger"}`}
    >
      <Icon className="size-4 shrink-0" />
      {state.message}
    </p>
  );
}
