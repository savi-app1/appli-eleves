import "server-only";
import { mkdir } from "node:fs/promises";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Connexion à la base :
 *  - DATABASE_URL défini  → PostgreSQL (production, préproduction) via `pg` ;
 *  - sinon                → PGlite (PostgreSQL embarqué) persisté dans ./.data/pglite (développement).
 * Une seule instance par processus (conservée sur globalThis pour survivre au rechargement à chaud).
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { db?: Db; ready?: Promise<Db> };
const holder = globalThis as unknown as { __saviDb?: Holder };
holder.__saviDb ??= {};

/**
 * URL PostgreSQL : DATABASE_URL, sinon celle injectée par l'hébergeur ou une extension reliée au site
 * (Netlify DB / Neon : NETLIFY_DATABASE_URL ; extension Supabase : SUPABASE_DATABASE_URL).
 */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.SUPABASE_DATABASE_URL || undefined;
}

/**
 * Applique les migrations au démarrage (une fois par processus) sous verrou consultatif PostgreSQL :
 * plusieurs instances serverless peuvent démarrer en même temps sans se marcher dessus.
 * Désactivable avec DB_AUTO_MIGRATE=0 (quand les migrations sont lancées par le pipeline de déploiement).
 */
async function migratePostgres(url: string) {
  const { Client } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(727_272)");
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(727_272)");
    } finally {
      await client.end();
    }
  }
}

async function create(): Promise<Db> {
  const url = databaseUrl();
  if (url) {
    if (process.env.DB_AUTO_MIGRATE !== "0") await migratePostgres(process.env.NETLIFY_DATABASE_URL_UNPOOLED || url);
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
    return drizzlePg(pool, { schema }) as unknown as Db;
  }
  // Imports dynamiques : PGlite (≈ 15 Mo) n'est chargé qu'en développement/tests, jamais dans un paquet serverless.
  const { PGlite } = await import("@electric-sql/pglite");
  const { unaccent } = await import("@electric-sql/pglite/contrib/unaccent");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
  const dataDir = process.env.PGLITE_DATA_DIR ?? "./.data/pglite";
  await mkdir(dataDir, { recursive: true });
  const client = await PGlite.create({ dataDir, extensions: { unaccent } });
  const db = drizzlePglite(client, { schema });
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  const h = holder.__saviDb!;
  if (h.db) return Promise.resolve(h.db);
  h.ready ??= create()
    .then((db) => (h.db = db))
    .catch((err) => {
      h.ready = undefined;
      throw err;
    });
  return h.ready;
}

export { schema };
