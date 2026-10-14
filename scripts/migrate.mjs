// Migration de production (sans TypeScript ni dépendances de développement) :
//   DATABASE_URL=postgresql://… node scripts/migrate.mjs
// Applique les fichiers SQL de ./drizzle dans l'ordre, de façon idempotente (table drizzle.__drizzle_migrations).
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL est requis (en développement, utiliser `npm run db:migrate`).");
  process.exit(1);
}
const pool = new Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migrations appliquées.");
} finally {
  await pool.end();
}
