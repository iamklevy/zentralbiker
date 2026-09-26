import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <>
      <h1>{t("common.not_found")}</h1>
      <p>{t("common.not_found_lead")}</p>
      <p>
        <Link href="/">{t("common.to_home")}</Link>
      </p>
    </>
  );
}
