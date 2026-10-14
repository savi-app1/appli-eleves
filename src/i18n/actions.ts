"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, THEME_COOKIE, resolveLocale } from "./config";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function setThemeAction(theme: "light" | "dark" | "system") {
  const store = await cookies();
  store.set(THEME_COOKIE, theme, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
}
