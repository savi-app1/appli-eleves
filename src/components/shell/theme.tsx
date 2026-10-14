"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
const KEY = "savi-theme";

/** Script inline exécuté avant le rendu pour éviter le flash de thème. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

/* Petit magasin externe : la préférence vit dans localStorage, React s'y abonne (pas de setState dans un effet). */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", cb);
    window.removeEventListener("storage", cb);
  };
}

function readPref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

function computeDark(pref: ThemePref) {
  return pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function applyTheme(pref: ThemePref) {
  localStorage.setItem(KEY, pref);
  document.documentElement.classList.toggle("dark", computeDark(pref));
  document.cookie = `${KEY}=${pref}; path=/; max-age=31536000; samesite=lax`;
  notify();
}

export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);
  return [pref, applyTheme];
}

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, () => computeDark(readPref()), () => false);
}

export function ThemeToggle() {
  const isDark = useIsDark();
  return (
    <button
      type="button"
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Passer au thème clair" : "Passer au thème sombre"}
      className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-2"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
