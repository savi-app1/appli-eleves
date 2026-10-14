import { defineConfig } from "drizzle-kit";

/**
 * Génération des migrations SQL : `npm run db:generate` (fonctionne hors ligne, sans base).
 * Application : `npm run db:migrate` (PGlite local si DATABASE_URL est vide, sinon le Postgres cible).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(process.env.DATABASE_URL ? { dbCredentials: { url: process.env.DATABASE_URL } } : {}),
});
