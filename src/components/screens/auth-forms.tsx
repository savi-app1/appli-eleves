"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { loginAction, registerAction, type AuthFormState } from "@/server/auth/actions";

const LEVEL_KEYS = ["primaire", "6e", "5e", "4e", "3e", "2nde", "1ere", "tle", "superieur", "concours"] as const;

function ErrorBox({ code }: { code?: AuthFormState["error"] }) {
  const t = useTranslations("authErrors");
  if (!code) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{t(code)}</span>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <ErrorBox code={state.error} />
      <Field label={t("identifier")} htmlFor="identifier" hint={t("identifierHint")}>
        <Input id="identifier" name="identifier" required autoComplete="username" inputMode="email" defaultValue={state.fields?.identifier} placeholder="awa@exemple.com" />
      </Field>
      <Field label={t("password")} htmlFor="password">
        <Input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
      </Field>
      <div className="flex justify-end">
        <Link href="/connexion?aide=mot-de-passe" className="text-sm font-semibold text-green">{t("forgot")}</Link>
      </div>
      <Button type="submit" size="lg" full loading={pending}>{t("login")}</Button>
    </form>
  );
}

export function RegisterForm({ countries }: { countries: readonly { code: string; name: string }[] }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, {});
  return (
    <form action={action} className="space-y-4">
      <ErrorBox code={state.error} />
      <Field label={t("firstName")} htmlFor="firstName">
        <Input id="firstName" name="firstName" required maxLength={60} autoComplete="given-name" defaultValue={state.fields?.firstName} placeholder="Awa" />
      </Field>
      <Field label={t("identifier")} htmlFor="identifier" hint={t("identifierHint")}>
        <Input id="identifier" name="identifier" required autoComplete="username" defaultValue={state.fields?.identifier} placeholder="awa@exemple.com" />
      </Field>
      <Field label={t("password")} htmlFor="password" hint={t("passwordHint")}>
        <Input id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="••••••••" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("level")} htmlFor="level">
          <Select id="level" name="level" defaultValue={state.fields?.level || "3e"}>
            {LEVEL_KEYS.map((k) => <option key={k} value={k}>{t(`levels.${k}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("country")} htmlFor="country">
          <Select id="country" name="country" defaultValue={state.fields?.country || "BF"}>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink">
        <input type="checkbox" name="consent" required className="mt-1 size-4 accent-green" />
        <span>
          {t.rich("consent", {
            terms: (c) => <Link href="/conditions" className="font-semibold text-green underline">{c}</Link>,
            privacy: (c) => <Link href="/confidentialite" className="font-semibold text-green underline">{c}</Link>,
          })}
        </span>
      </label>
      <p className="rounded-xl bg-info-soft px-3 py-2 text-xs text-ink">{t("minorNotice")}</p>
      <Badge tone="green">✨ {t("trialBadge")}</Badge>
      <Button type="submit" size="lg" full loading={pending}>{t("register")}</Button>
    </form>
  );
}
