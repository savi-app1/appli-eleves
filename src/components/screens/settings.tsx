"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Toggle } from "@/components/ui/form";
import { applyTheme, type ThemePref } from "@/components/shell/theme";
import { LOCALE_INFO, LOCALES, SELECTABLE_UI_LOCALES, type Locale } from "@/i18n/config";
import { updatePreferencesAction } from "@/server/auth/actions";
import { cn } from "@/lib/utils";

const LEVEL_KEYS = ["primaire", "6e", "5e", "4e", "3e", "2nde", "1ere", "tle", "superieur", "concours"] as const;

export interface SettingsInitial {
  firstName: string;
  level: string;
  country: string;
  questionLocale: string;
  answerLocale: string;
  alsoFrench: boolean;
  theme: ThemePref;
}

function StatusBadge({ status }: { status: "stable" | "beta" | "planned" }) {
  const t = useTranslations("common");
  if (status === "stable") return null;
  return <Badge tone={status === "beta" ? "warning" : "gray"}>{status === "beta" ? t("beta") : t("soon")}</Badge>;
}

function LocaleOption({ code, selected, onSelect, disabled }: { code: Locale; selected: boolean; onSelect: () => void; disabled?: boolean }) {
  const info = LOCALE_INFO[code];
  const t = useTranslations("settings");
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 disabled:opacity-50", selected && "bg-green-soft/60")}
    >
      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border", selected ? "border-green bg-green text-white" : "border-line")}>
        {selected ? <Check className="size-3.5" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold text-ink">{info.nativeName}</span>
          {info.nativeName !== info.frenchName ? <span className="text-xs text-muted">({info.frenchName})</span> : null}
          <StatusBadge status={info.status} />
        </span>
        <span className="block text-xs text-muted">{t(`status.${info.status}`)}</span>
      </span>
    </button>
  );
}

export function SettingsScreen({ initial, countries }: { initial: SettingsInitial; countries: { code: string; name: string }[] }) {
  const t = useTranslations("settings");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();
  const [question, setQuestion] = useState<string>(initial.questionLocale);
  const [answer, setAnswer] = useState<Locale>(initial.answerLocale as Locale);
  const [alsoFrench, setAlsoFrench] = useState(initial.alsoFrench);
  const [theme, setTheme] = useState<ThemePref>(initial.theme);
  const [saved, setSaved] = useState(false);

  function save(patch: Parameters<typeof updatePreferencesAction>[0]) {
    setSaved(false);
    startTransition(async () => {
      const r = await updatePreferencesAction(patch);
      if (r.ok) setSaved(true);
    });
  }

  const themes: { key: ThemePref; Icon: typeof Sun }[] = [{ key: "light", Icon: Sun }, { key: "dark", Icon: Moon }, { key: "system", Icon: Monitor }];

  return (
    <div className={cn("space-y-4", pending && "opacity-70")}>
      <Card>
        <CardTitle>{ta("registerSubtitle")}</CardTitle>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            save({ firstName: String(fd.get("firstName")), level: String(fd.get("level")), country: String(fd.get("country")) });
          }}
        >
          <Field label={ta("firstName")} htmlFor="firstName"><Input id="firstName" name="firstName" defaultValue={initial.firstName} maxLength={60} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={ta("level")} htmlFor="level">
              <Select id="level" name="level" defaultValue={initial.level}>{LEVEL_KEYS.map((k) => <option key={k} value={k}>{ta(`levels.${k}`)}</option>)}</Select>
            </Field>
            <Field label={ta("country")} htmlFor="country">
              <Select id="country" name="country" defaultValue={initial.country}>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select>
            </Field>
          </div>
          <Button type="submit" variant="secondary" loading={pending}>{tc("save")}</Button>
          {saved ? <span className="ml-3 text-sm font-semibold text-green">✓</span> : null}
        </form>
      </Card>

      <Card className="p-0">
        <div className="px-4 pt-4"><CardTitle>{t("interfaceLanguage")}</CardTitle><p className="-mt-2 mb-2 text-xs text-muted">{t("interfaceHint")}</p></div>
        <div className="divide-y divide-line border-t border-line">
          {SELECTABLE_UI_LOCALES.map((code) => (
            <LocaleOption key={code} code={code} selected={locale === code} onSelect={() => save({ uiLocale: code })} />
          ))}
        </div>
      </Card>

      <Card className="p-0">
        <div className="px-4 pt-4"><CardTitle>{t("questionLanguage")}</CardTitle><p className="-mt-2 mb-2 text-xs text-muted">{t("questionHint")}</p></div>
        <div className="divide-y divide-line border-t border-line">
          <button type="button" onClick={() => { setQuestion("auto"); save({ questionLocale: "auto" }); }} aria-pressed={question === "auto"} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2", question === "auto" && "bg-green-soft/60")}>
            <span className={cn("flex size-6 items-center justify-center rounded-full border", question === "auto" ? "border-green bg-green text-white" : "border-line")}>{question === "auto" ? <Check className="size-3.5" /> : null}</span>
            <span className="text-[15px] font-semibold text-ink">{t("auto")}</span>
          </button>
          {LOCALES.filter((c) => LOCALE_INFO[c].status !== "planned").map((code) => (
            <LocaleOption key={code} code={code} selected={question === code} onSelect={() => { setQuestion(code); save({ questionLocale: code }); }} />
          ))}
        </div>
      </Card>

      <Card className="p-0">
        <div className="px-4 pt-4"><CardTitle>{t("answerLanguage")}</CardTitle><p className="-mt-2 mb-2 text-xs text-muted">{t("answerHint")}</p></div>
        <div className="divide-y divide-line border-t border-line">
          {LOCALES.map((code) => (
            <LocaleOption key={code} code={code} selected={answer === code} onSelect={() => { setAnswer(code); save({ answerLocale: code }); }} disabled={!LOCALE_INFO[code].aiAnswers} />
          ))}
        </div>
        {LOCALE_INFO[answer].status === "beta" ? (
          <div className="space-y-3 border-t border-line p-4">
            <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-ink">{t("betaWarning")}</p>
            <Toggle id="alsoFrench" checked={alsoFrench} onChange={(v) => { setAlsoFrench(v); save({ alsoFrench: v }); }} label={t("alsoFrench")} />
          </div>
        ) : null}
      </Card>

      <Card>
        <CardTitle>{t("theme")}</CardTitle>
        <div className="grid grid-cols-3 gap-2">
          {themes.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTheme(key); applyTheme(key); save({ theme: key }); }}
              aria-pressed={theme === key}
              className={cn("flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-semibold", theme === key ? "border-green bg-green-soft text-green-ink" : "border-line text-ink")}
            >
              <Icon className="size-5" /> {t(`themes.${key}`)}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
