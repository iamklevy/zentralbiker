"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { sendContact, type FormState } from "@/lib/contact/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Honeypot, FormMessage } from "./form-bits";

export function ContactForm() {
  const t = useTranslations("contact");
  const [state, action, pending] = useActionState<FormState, FormData>(sendContact, null);

  return (
    <form action={action} className="rounded-card border border-line bg-paper p-5 shadow-soft md:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="ct-name">{t("name")}</Label>
          <Input id="ct-name" name="name" required maxLength={80} autoComplete="name" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ct-email">{t("email")}</Label>
          <Input id="ct-email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>

      <div className="mt-4 grid gap-1.5">
        <Label htmlFor="ct-subject">{t("subject")}</Label>
        <Input id="ct-subject" name="subject" maxLength={140} />
      </div>

      <div className="mt-4 grid gap-1.5">
        <Label htmlFor="ct-message">{t("message")}</Label>
        <Textarea id="ct-message" name="message" required rows={7} maxLength={5000} />
      </div>

      <Honeypot />

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending} className="rounded-full bg-accent hover:bg-accent-2">
          {pending ? t("sending") : t("submit")}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
