import { PGlite } from "@electric-sql/pglite";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";

/** Base PostgreSQL éphémère (en mémoire) avec le schéma SAVI migré : chaque suite de tests part de zéro. */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = await PGlite.create({ extensions: { unaccent } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db: db as unknown as Db, close: () => client.close() };
}
