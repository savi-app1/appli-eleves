/**
 * Configuration des langues de SAVI.
 *
 * Trois notions distinctes dans l'application :
 *  - la langue de l'INTERFACE (menus, boutons) : définie ici ;
 *  - la langue de la QUESTION de l'élève : détectée ou choisie à chaque échange ;
 *  - la langue de la RÉPONSE de l'IA : préférence utilisateur, modifiable à tout moment.
 *
 * Le statut est affiché honnêtement dans les paramètres : seule une langue « stable »
 * est annoncée comme entièrement prise en charge.
 */
export const LOCALES = ["fr", "en", "mos", "dyu", "ff", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export type LocaleStatus = "stable" | "beta" | "planned";

export interface LocaleInfo {
  code: Locale;
  /** Nom dans la langue elle-même (endonyme) */
  nativeName: string;
  /** Nom en français, pour les paramètres */
  frenchName: string;
  status: LocaleStatus;
  /** Peut-on choisir cette langue pour les RÉPONSES de l'IA ? */
  aiAnswers: boolean;
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  fr: { code: "fr", nativeName: "Français", frenchName: "Français", status: "stable", aiAnswers: true },
  en: { code: "en", nativeName: "English", frenchName: "Anglais", status: "beta", aiAnswers: true },
  mos: { code: "mos", nativeName: "Mooré", frenchName: "Mooré", status: "beta", aiAnswers: true },
  dyu: { code: "dyu", nativeName: "Julakan", frenchName: "Dioula", status: "beta", aiAnswers: true },
  ff: { code: "ff", nativeName: "Fulfulde", frenchName: "Fulfuldé", status: "beta", aiAnswers: true },
  es: { code: "es", nativeName: "Español", frenchName: "Espagnol", status: "planned", aiAnswers: false },
};

/** Langues proposées pour l'interface (les langues « prévues » n'apparaissent pas encore). */
export const SELECTABLE_UI_LOCALES = LOCALES.filter((l) => LOCALE_INFO[l].status !== "planned");

export const LOCALE_COOKIE = "savi-locale";
export const THEME_COOKIE = "savi-theme";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) && LOCALE_INFO[value].status !== "planned" ? value : DEFAULT_LOCALE;
}
