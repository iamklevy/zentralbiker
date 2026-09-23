import "server-only";
import { Resend } from "resend";

/** Sender identity — the domain must be verified in the Resend dashboard. */
export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Zentralbiker <post@zentralbiker.ch>";

let client: Resend | null = null;

/** Lazy singleton, so a missing RESEND_API_KEY only breaks sending, not the module graph. */
function resend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * Send an email, reporting whether it actually went out.
 *
 * Unlike a fire-and-forget notification, both callers here (the contact form
 * and the newsletter opt-in) need the result: if the mail fails, the visitor
 * must be told rather than shown a success message for something that never
 * arrived.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email:", opts.subject, "->", opts.to);
    return false;
  }
  try {
    const { error } = await resend().emails.send({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    if (error) {
      console.error("sendEmail failed", opts.subject, "->", opts.to, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendEmail threw", opts.subject, "->", opts.to, err);
    return false;
  }
}

/** Escape untrusted text before it goes into an HTML email body. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared shell so both templates look like the site. */
export function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f2ea;padding:24px;font-family:-apple-system,Segoe UI,system-ui,sans-serif;color:#1b1d21">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border:1px solid #e3e0d9;border-radius:12px">
      <tr><td style="padding:26px 30px">
        <p style="margin:0 0 14px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#c0392b;font-weight:700">Zentralbiker</p>
        <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3">${esc(title)}</h1>
        ${body}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
