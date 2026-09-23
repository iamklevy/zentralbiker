"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { subscribe, type FormState } from "@/lib/newsletter/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Honeypot, FormMessage } from "./form-bits";

export function NewsletterForm() {
  const t = useTranslations("newsletter");
  const [state, action, pending] = useActionState<FormState, FormData>(subscribe, null);

  return (
    <form action={action} className="rounded-card border border-line bg-paper p-5 shadow-soft md:p-6">
      <div className="grid gap-1.5">
        <Label htmlFor="nl-email">{t("email")}</Label>
        <div className="flex flex-wrap gap-3">
          <Input
            id="nl-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="min-w-56 flex-1"
          />
          <Button type="submit" disabled={pending} className="rounded-full bg-accent hover:bg-accent-2">
            {pending ? t("sending") : t("submit")}
          </Button>
        </div>
      </div>

      <Honeypot />

      <div className="mt-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
