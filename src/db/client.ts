import "server-only";
import { mkdir } from "node:fs/promises";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
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

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
    return drizzlePg(pool, { schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { unaccent } = await import("@electric-sql/pglite/contrib/unaccent");
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
  h.ready ??= create().then((db) => (h.db = db));
  return h.ready;
}

export { schema };
