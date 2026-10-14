-- Recherche plein texte insensible aux accents (les élèves tapent souvent sans accents sur téléphone).
-- Nécessite l'extension standard `unaccent` (fournie avec PostgreSQL / postgresql-contrib ; disponible sur Neon, Supabase, RDS).
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION french_unaccent (COPY = french);--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION french_unaccent ALTER MAPPING FOR hword, hword_part, word WITH unaccent, french_stem;--> statement-breakpoint
ALTER TABLE "document_chunks" drop column "tsv";--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('french_unaccent', content)) STORED;--> statement-breakpoint
CREATE INDEX "chunks_tsv_idx" ON "document_chunks" USING gin ("tsv");
