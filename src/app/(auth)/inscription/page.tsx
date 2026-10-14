import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { LogoMark } from "@/components/shell/logo";
import { mockExamCatalogue } from "@/lib/mock-data";

const LEVEL_KEYS = ["primaire", "6e", "5e", "4e", "3e", "2nde", "1ere", "tle", "superieur", "concours"] as const;

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  return (
    <div className="flex flex-1 flex-col pb-8">
      <div className="mt-2 mb-6 flex flex-col items-center text-center">
        <LogoMark size={48} />
        <h1 className="mt-3 text-2xl font-extrabold text-ink">{t("registerTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("registerSubtitle")}</p>
        <Badge tone="green" className="mt-3">✨ {t("trialBadge")}</Badge>
      </div>

      <form className="space-y-4" action="/accueil">
        <Field label={t("firstName")} htmlFor="firstName">
          <Input id="firstName" name="firstName" autoComplete="given-name" placeholder="Awa" />
        </Field>
        <Field label={t("identifier")} htmlFor="identifier" hint={t("identifierHint")}>
          <Input id="identifier" name="identifier" autoComplete="username" placeholder="awa@exemple.com" />
        </Field>
        <Field label={t("password")} htmlFor="password" hint={t("passwordHint")}>
          <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="••••••••" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("level")} htmlFor="level">
            <Select id="level" name="level" defaultValue="3e">
              {LEVEL_KEYS.map((k) => (
                <option key={k} value={k}>{t(`levels.${k}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("country")} htmlFor="country">
            <Select id="country" name="country" defaultValue="BF">
              {mockExamCatalogue.countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <label className="flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" className="mt-1 size-4 accent-green" defaultChecked />
          <span>
            {t.rich("consent", {
              terms: (c) => <Link href="#" className="font-semibold text-green underline">{c}</Link>,
              privacy: (c) => <Link href="#" className="font-semibold text-green underline">{c}</Link>,
            })}
          </span>
        </label>
        <p className="rounded-xl bg-info-soft px-3 py-2 text-xs text-ink">{t("minorNotice")}</p>

        <ButtonLink href="/accueil" size="lg" full>
          {t("register")}
        </ButtonLink>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("alreadyAccount")}{" "}
        <Link href="/connexion" className="font-semibold text-green">{t("login")}</Link>
      </p>
    </div>
  );
}
