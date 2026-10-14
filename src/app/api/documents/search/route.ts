import { getDb } from "@/db/client";
import { apiUser, isResponse } from "@/server/api-auth";
import { searchDocuments } from "@/server/documents/search";

/** Recherche plein texte dans les documents de l'utilisateur (titres + contenu). */
export async function GET(req: Request) {
  const current = await apiUser();
  if (isResponse(current)) return current;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 200);
  if (q.length < 2) return Response.json({ hits: [] });
  const db = await getDb();
  const hits = await searchDocuments(db, current.user.id, q, 12);
  return Response.json({ hits });
}
