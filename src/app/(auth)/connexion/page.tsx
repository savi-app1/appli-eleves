import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/screens/auth-forms";
import { LogoMark } from "@/components/shell/logo";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; aide?: string }> }) {
  const t = await getTranslations("auth");
  const { next, aide } = await searchParams;
  return (
    <div className="flex flex-1 flex-col pb-8">
      <div className="mt-2 mb-8 flex flex-col items-center text-center">
        <LogoMark size={56} />
        <h1 className="mt-4 text-2xl font-extrabold text-ink">{t("loginTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("loginSubtitle")}</p>
      </div>
      {aide === "mot-de-passe" ? (
        <p className="mb-4 rounded-xl bg-info-soft px-3 py-2.5 text-sm text-ink">{t("forgotHelp")}</p>
      ) : null}
      <LoginForm next={next} />
      <p className="mt-8 text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/inscription" className="font-semibold text-green">{t("createOne")}</Link>
      </p>
    </div>
  );
}
