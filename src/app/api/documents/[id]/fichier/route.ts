import { getDb } from "@/db/client";
import { apiUser, isResponse } from "@/server/api-auth";
import { getDocument } from "@/server/documents/service";
import { getStorage } from "@/server/storage";

/** Fichier original d'un document : uniquement pour son propriétaire. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const current = await apiUser();
  if (isResponse(current)) return current;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const doc = await getDocument(db, current.user.id, id);
  if (!doc) return new Response("Not found", { status: 404 });
  const data = await getStorage().get(doc.storageKey);
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": doc.mime,
      "content-length": String(data.byteLength),
      "content-disposition": `inline; filename="${encodeURIComponent(doc.title)}"`,
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}
