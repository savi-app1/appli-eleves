/**
 * Applique les migrations SQL du dossier ./drizzle sur la base cible.
 * Usage : `npm run db:migrate` (DATABASE_URL vide → PGlite local).
 */
import * as schema from "./schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url, max: 1 });
    await migrate(drizzle(pool, { schema }), { migrationsFolder: "./drizzle" });
    await pool.end();
    console.log("Migrations appliquées sur PostgreSQL.");
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = await PGlite.create({ dataDir: process.env.PGLITE_DATA_DIR ?? "./.data/pglite" });
    await migrate(drizzle(client, { schema }), { migrationsFolder: "./drizzle" });
    await client.close();
    console.log("Migrations appliquées sur PGlite (./.data/pglite).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
