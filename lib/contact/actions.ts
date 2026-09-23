"use server";

import { getTranslations } from "next-intl/server";
import { sendEmail, layout, esc } from "@/lib/email/client";

export type FormState = { ok: boolean; message: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX = { name: 80, subject: 140, message: 5000 };

export async function sendContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("contact");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const trap = String(formData.get("website") ?? "").trim();

  if (trap) return { ok: true, message: t("success") };
  if (!name || !message || !EMAIL_RE.test(email)) return { ok: false, message: t("required") };
  if (name.length > MAX.name || subject.length > MAX.subject || message.length > MAX.message) {
    return { ok: false, message: t("required") };
  }

  const to = process.env.CONTACT_TO;
  if (!to) {
    console.error("CONTACT_TO is not set — contact form cannot deliver");
    return { ok: false, message: t("error") };
  }

  /*
   * Everything interpolated below is visitor-supplied, so it is escaped
   * before it reaches the HTML body. `replyTo` carries the sender's address
   * so a reply goes to them, while the envelope stays on our verified domain
   * — putting a stranger's address in `from` would fail SPF/DKIM.
   */
  const sent = await sendEmail({
    to,
    replyTo: email,
    subject: subject ? `Kontakt: ${subject}` : `Kontaktformular — ${name}`,
    html: layout(
      subject || "Nachricht über das Kontaktformular",
      `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6;color:#33373d">
         <tr><td style="padding:2px 12px 2px 0;color:#6b7079">Name</td><td>${esc(name)}</td></tr>
         <tr><td style="padding:2px 12px 2px 0;color:#6b7079">E-Mail</td><td>${esc(email)}</td></tr>
       </table>
       <hr style="border:none;border-top:1px solid #e3e0d9;margin:18px 0" />
       <p style="margin:0;font-size:15px;line-height:1.7;white-space:pre-wrap;color:#1b1d21">${esc(message)}</p>`,
    ),
  });

  if (!sent) return { ok: false, message: t("error") };
  return { ok: true, message: t("success") };
}
