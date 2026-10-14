import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { LogoMark } from "@/components/shell/logo";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <div className="flex flex-1 flex-col pb-8">
      <div className="mt-2 mb-8 flex flex-col items-center text-center">
        <LogoMark size={56} />
        <h1 className="mt-4 text-2xl font-extrabold text-ink">{t("loginTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("loginSubtitle")}</p>
      </div>

      {/* Maquette : le formulaire sera relié à l'API d'authentification à l'étape 3 */}
      <form className="space-y-4" action="/accueil">
        <Field label={t("identifier")} htmlFor="identifier" hint={t("identifierHint")}>
          <Input id="identifier" name="identifier" autoComplete="username" inputMode="email" placeholder="awa@exemple.com" />
        </Field>
        <Field label={t("password")} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" />
        </Field>
        <div className="flex justify-end">
          <Link href="#" className="text-sm font-semibold text-green">{t("forgot")}</Link>
        </div>
        <ButtonLink href="/accueil" size="lg" full>
          {t("login")}
        </ButtonLink>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/inscription" className="font-semibold text-green">{t("createOne")}</Link>
      </p>
    </div>
  );
}
