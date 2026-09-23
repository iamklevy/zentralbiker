"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { supabaseServer, hasSupabase } from "@/lib/supabase/server";

export interface GuestbookEntry {
  id: string;
  name: string;
  location: string | null;
  message: string;
  created_at: string;
}

export type FormState = { ok: boolean; message: string } | null;

const MAX_MESSAGE = 2000;
const MAX_NAME = 80;
/** One post per IP per this window. */
const RATE_WINDOW_MS = 60_000;

/**
 * Hash the caller's IP rather than storing it.
 *
 * Rate limiting needs to recognise a repeat poster, not identify them, and a
 * guestbook is not a good reason to keep a log of visitors' addresses. The
 * salt means the hashes are useless outside this deployment.
 */
async function ipHash(): Promise<string | null> {
  const h = await headers();
  const raw = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  if (!raw) return null;
  const salt = process.env.SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "zb";
  return createHash("sha256").update(salt + raw).digest("hex").slice(0, 32);
}

/** Approved entries, newest first. Safe to call when Supabase is unconfigured. */
export async function listEntries(limit = 100): Promise<GuestbookEntry[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseServer()
    .from("guestbook_entries")
    .select("id,name,location,message,created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listEntries failed", error);
    return [];
  }
  return (data ?? []) as GuestbookEntry[];
}

export async function submitEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("guestbook");

  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  // Honeypot: a real person never fills a field they cannot see.
  const trap = String(formData.get("website") ?? "").trim();

  if (trap) return { ok: true, message: t("success") };
  if (!name || !message) return { ok: false, message: t("required") };
  if (message.length > MAX_MESSAGE || name.length > MAX_NAME) {
    return { ok: false, message: t("too_long") };
  }
  if (!hasSupabase()) {
    console.warn("guestbook: Supabase not configured — entry discarded");
    return { ok: false, message: t("error") };
  }

  const db = supabaseServer();
  const hash = await ipHash();

  if (hash) {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await db
      .from("guestbook_entries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", hash)
      .gte("created_at", since);
    if ((count ?? 0) > 0) return { ok: false, message: t("rate_limited") };
  }

  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  const { error } = await db.from("guestbook_entries").insert({
    name,
    location: location || null,
    message,
    ip_hash: hash,
    user_agent: ua,
    // Held for moderation — see supabase/schema.sql.
    approved: false,
  });

  if (error) {
    console.error("submitEntry failed", error);
    return { ok: false, message: t("error") };
  }

  revalidatePath("/varia/gaestebuch");
  return { ok: true, message: t("success") };
}
