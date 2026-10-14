import { sql } from "drizzle-orm";
import { databaseUrl, getDb } from "@/db/client";
import { appEnv, paymentProviderConfig } from "@/server/billing/providers";

export const dynamic = "force-dynamic";

/** État de santé (supervision) : aucun secret, aucune donnée personnelle. */
export async function GET() {
  let db: "ok" | "error" | "unconfigured" = databaseUrl() ? "error" : "unconfigured";
  let dbDetail: string | undefined;
  try {
    const conn = await getDb();
    await conn.execute(sql`select 1`);
    db = "ok";
  } catch (err) {
    db = "error";
    dbDetail = (err as Error)?.message?.slice(0, 120);
    console.error("[sante] base de données", err);
  }
  const payment = paymentProviderConfig();
  // Hors production : noms (jamais les valeurs) des variables de base/hébergeur présentes, pour diagnostiquer un déploiement.
  const diagnostic =
    appEnv() !== "production"
      ? {
          envKeys: Object.keys(process.env)
            .filter((k) => /DATABASE|NEON|SUPABASE|^NETLIFY_|^CONTEXT$|^DEPLOY_|^SITE_NAME$|^URL$/.test(k) && !/TOKEN|KEY|SECRET/.test(k))
            .sort(),
          build: process.env.SAVI_BUILD_INFO,
        }
      : {};
  const body = {
    ok: db === "ok",
    env: appEnv(),
    db,
    ...(dbDetail && appEnv() !== "production" ? { dbDetail } : {}),
    storage: process.env.STORAGE_PROVIDER ?? "local",
    ai: process.env.AI_PROVIDER ?? "mock",
    payment: payment.enabled ? payment.provider.id : `disabled:${payment.reason}`,
    time: new Date().toISOString(),
    ...diagnostic,
  };
  return Response.json(body, { status: body.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
