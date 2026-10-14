import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@/db/schema";
import { requireUser, type CurrentUser } from "@/server/auth/current";

/**
 * Rôle administrateur : `users.role = 'admin'` ou identifiant (e-mail / téléphone) listé dans ADMIN_IDENTIFIERS.
 * Périmètre volontairement limité : gestion des paiements uniquement. Aucune route n'expose les conversations,
 * documents ou corrections d'un autre utilisateur.
 */
export function isAdmin(user: Pick<User, "role" | "email" | "phone">): boolean {
  if (user.role === "admin") return true;
  const allowed = (process.env.ADMIN_IDENTIFIERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return false;
  return (!!user.email && allowed.includes(user.email.toLowerCase())) || (!!user.phone && allowed.includes(user.phone.replace(/\s+/g, "")));
}

export async function requireAdmin(): Promise<CurrentUser> {
  const current = await requireUser();
  if (!isAdmin(current.user)) redirect("/accueil");
  return current;
}
