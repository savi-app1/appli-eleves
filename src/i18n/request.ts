import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale, type Locale } from "./config";

type Messages = Record<string, unknown>;

/**
 * Fusion profonde : les clés absentes d'une langue partiellement traduite
 * retombent sur le français, afin de ne jamais afficher de clé technique à l'écran.
 */
function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      current && typeof current === "object" && !Array.isArray(current)
    ) {
      out[key] = deepMerge(current as Messages, value as Messages);
    } else if (value !== undefined && value !== "") {
      out[key] = value;
    }
  }
  return out;
}

async function loadMessages(locale: Locale): Promise<Messages> {
  const base = (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default as Messages;
  if (locale === DEFAULT_LOCALE) return base;
  const override = (await import(`../../messages/${locale}.json`)).default as Messages;
  return deepMerge(base, override);
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);
  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: "Africa/Ouagadougou",
  };
});
