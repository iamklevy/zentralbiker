import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <Section className="py-20 md:py-28">
      <p className="font-display text-[4rem] font-semibold leading-none text-accent/25">404</p>
      <h1 className="mt-3 text-[clamp(1.7rem,1.3rem+2vw,2.6rem)]">{t("common.not_found")}</h1>
      <p className="mt-3 max-w-[52ch] text-muted">{t("common.not_found_lead")}</p>
      <Button asChild className="mt-7 rounded-full bg-accent hover:bg-accent-2">
        <Link href="/">{t("common.to_home")}</Link>
      </Button>
    </Section>
  );
}
