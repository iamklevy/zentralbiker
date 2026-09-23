"use server";

import { randomBytes } from "node:crypto";
import { getTranslations } from "next-intl/server";

import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { sendEmail, layout, esc } from "@/lib/email/client";

export type FormState = { ok: boolean; message: string } | null;

/** Deliberately permissive — real validation is the confirmation mail arriving. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export async function subscribe(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("newsletter");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const trap = String(formData.get("website") ?? "").trim();

  if (trap) return { ok: true, message: t("success") };
  if (!EMAIL_RE.test(email)) return { ok: false, message: t("invalid") };
  if (!hasSupabase()) {
    console.warn("newsletter: Supabase not configured — signup discarded");
    return { ok: false, message: t("error") };
  }

  const db = supabaseServer();

  const { data: existing } = await db
    .from("newsletter_subscribers")
    .select("id,confirmed_at")
    .eq("email", email)
    .maybeSingle();

  // Already on the list and confirmed — say so rather than re-sending.
  if (existing?.confirmed_at) return { ok: false, message: t("already") };

  const token = randomBytes(24).toString("hex");

  // An unconfirmed row gets a fresh token instead of a duplicate row, so a
  // visitor who lost the first mail can simply submit the form again.
  const { error } = existing
    ? await db.from("newsletter_subscribers").update({ token }).eq("id", existing.id)
    : await db.from("newsletter_subscribers").insert({ email, token });

  if (error) {
    console.error("subscribe failed", error);
    return { ok: false, message: t("error") };
  }

  const link = `${siteUrl()}/api/newsletter/confirm?token=${token}`;
  const sent = await sendEmail({
    to: email,
    subject: "Newsletter bestätigen — Zentralbiker",
    html: layout(
      "Newsletter bestätigen",
      `<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#33373d">
         Bitte bestätige deine Adresse, damit wir dir schreiben dürfen.
       </p>
       <p style="margin:0 0 22px">
         <a href="${esc(link)}" style="display:inline-block;background:#c0392b;color:#fffdf8;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:600;font-size:15px">Adresse bestätigen</a>
       </p>
       <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7079">
         Wenn du dich nicht angemeldet hast, ignoriere dieses Mail einfach.
       </p>`,
    ),
  });

  // The row is useless without a delivered token, so surface the failure.
  if (!sent) return { ok: false, message: t("error") };

  return { ok: true, message: t("success") };
}

/** Marks a subscriber confirmed. Returns false for an unknown/expired token. */
export async function confirmToken(token: string): Promise<boolean> {
  if (!hasSupabase() || !token) return false;

  const { data, error } = await supabaseServer()
    .from("newsletter_subscribers")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("token", token)
    .is("confirmed_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("confirmToken failed", error);
    return false;
  }
  return Boolean(data);
}
