import type { Db } from "@/db/client";
import { auditLog } from "@/db/schema";

/** Journal d'audit des actions sensibles. Jamais de contenu de conversation ni de secret dans `meta`. */
export async function audit(db: Db, action: string, userId: string | null, meta?: Record<string, unknown>) {
  try {
    await db.insert(auditLog).values({ action, userId, meta: meta ?? null });
  } catch (e) {
    console.error("[audit] échec d'écriture", action, e);
  }
}
