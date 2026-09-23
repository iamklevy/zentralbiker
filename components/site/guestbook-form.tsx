"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { submitEntry, type FormState } from "@/lib/guestbook/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Honeypot, FormMessage } from "./form-bits";

export function GuestbookForm() {
  const t = useTranslations("guestbook");
  const [state, action, pending] = useActionState<FormState, FormData>(submitEntry, null);

  return (
    <form action={action} className="rounded-card border border-line bg-paper p-5 shadow-soft md:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="gb-name">{t("name")}</Label>
          <Input id="gb-name" name="name" required maxLength={80} autoComplete="name" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="gb-location">{t("location")}</Label>
          <Input id="gb-location" name="location" maxLength={80} />
        </div>
      </div>

      <div className="mt-4 grid gap-1.5">
        <Label htmlFor="gb-message">{t("message")}</Label>
        <Textarea id="gb-message" name="message" required rows={5} maxLength={2000} />
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
