import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/screens/auth-forms";
import { LogoMark } from "@/components/shell/logo";
import { EXAM_COUNTRIES } from "@/lib/exam-catalogue";

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  return (
    <div className="flex flex-1 flex-col pb-8">
      <div className="mt-2 mb-6 flex flex-col items-center text-center">
        <LogoMark size={48} />
        <h1 className="mt-3 text-2xl font-extrabold text-ink">{t("registerTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("registerSubtitle")}</p>
      </div>
      <RegisterForm countries={EXAM_COUNTRIES} />
      <p className="mt-6 text-center text-sm text-muted">
        {t("alreadyAccount")}{" "}
        <Link href="/connexion" className="font-semibold text-green">{t("login")}</Link>
      </p>
    </div>
  );
}
