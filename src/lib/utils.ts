import { clsx, type ClassValue } from "clsx";

/** Concatène des classes conditionnelles (sans tailwind-merge : les composants évitent les conflits). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatXof(amount: number, locale = "fr-FR") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount) + " FCFA";
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function daysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
