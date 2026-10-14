import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { documentChunks, documents } from "@/db/schema";

export interface ChunkHit {
  documentId: string;
  title: string;
  page: number | null;
  idx: number;
  content: string;
  rank: number;
}

/**
 * Recherche plein texte (PostgreSQL, dictionnaire français) dans les extraits des documents de l'utilisateur.
 * Si aucun extrait ne correspond aux mots de la question, renvoie les premiers extraits des documents
 * (le prompt strict dira alors honnêtement si l'information manque).
 */
export async function searchChunks(db: Db, userId: string, documentIds: string[], query: string, limit = 6): Promise<ChunkHit[]> {
  if (documentIds.length === 0) return [];
  const inDocs = sql`${documentChunks.documentId} = ANY(ARRAY[${sql.join(documentIds.map((d) => sql`${d}::uuid`), sql`, `)}])`;
  const q = query.replace(/[^\p{L}\p{N}\s'-]/gu, " ").trim().slice(0, 300);
  if (q) {
    const tsq = sql`websearch_to_tsquery('french_unaccent', ${q})`;
    const rows = await db
      .select({
        documentId: documentChunks.documentId,
        title: documents.title,
        page: documentChunks.page,
        idx: documentChunks.idx,
        content: documentChunks.content,
        rank: sql<number>`ts_rank_cd(${documentChunks.tsv}, ${tsq})`,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documents.id, documentChunks.documentId))
      .where(and(eq(documentChunks.userId, userId), inDocs, sql`${documentChunks.tsv} @@ ${tsq}`))
      .orderBy(desc(sql`ts_rank_cd(${documentChunks.tsv}, ${tsq})`))
      .limit(limit);
    if (rows.length) return rows;
  }
  const fallback = await db
    .select({ documentId: documentChunks.documentId, title: documents.title, page: documentChunks.page, idx: documentChunks.idx, content: documentChunks.content, rank: sql<number>`0` })
    .from(documentChunks)
    .innerJoin(documents, eq(documents.id, documentChunks.documentId))
    .where(and(eq(documentChunks.userId, userId), inDocs))
    .orderBy(documentChunks.documentId, documentChunks.idx)
    .limit(Math.min(limit, 4));
  return fallback;
}

/** Recherche dans tous les documents de l'utilisateur (barre de recherche « Mes cours »). */
export async function searchDocuments(db: Db, userId: string, query: string, limit = 10) {
  const q = query.replace(/[^\p{L}\p{N}\s'-]/gu, " ").trim().slice(0, 200);
  if (q.length < 2) return [];
  const tsq = sql`websearch_to_tsquery('french_unaccent', ${q})`;
  return db
    .select({
      documentId: documentChunks.documentId,
      title: documents.title,
      page: documentChunks.page,
      snippet: sql<string>`ts_headline('french_unaccent', ${documentChunks.content}, ${tsq}, 'MaxWords=25, MinWords=10, StartSel=**, StopSel=**')`,
      rank: sql<number>`ts_rank_cd(${documentChunks.tsv}, ${tsq})`,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documents.id, documentChunks.documentId))
    .where(and(eq(documentChunks.userId, userId), sql`${documentChunks.tsv} @@ ${tsq}`))
    .orderBy(desc(sql`ts_rank_cd(${documentChunks.tsv}, ${tsq})`))
    .limit(limit);
}
