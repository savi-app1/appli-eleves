import { getDb } from "@/db/client";
import { apiUser, isResponse } from "@/server/api-auth";
import { errorResponse } from "@/server/ai/guard";
import { MAX_UPLOAD_BYTES } from "@/server/storage";
import { uploadDocument } from "@/server/documents/service";

export const maxDuration = 120;

function wantsJson(req: Request) {
  return (req.headers.get("accept") ?? "").includes("application/json");
}

/** Import d'un document (multipart) : formulaire classique (redirection) ou appel JSON. */
export async function POST(req: Request) {
  const current = await apiUser();
  if (isResponse(current)) return current;
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_UPLOAD_BYTES + 64 * 1024) return Response.json({ error: "too_large" }, { status: 413 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) return Response.json({ error: "invalid", message: "Fichier manquant" }, { status: 400 });
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  try {
    const db = await getDb();
    const doc = await uploadDocument(db, current.user, {
      buffer: Buffer.from(await file.arrayBuffer()),
      declaredMime: file.type,
      filename: file.name,
      title: str("title"),
      chapter: str("chapter"),
      subjectId: str("subjectId"),
    });
    if (wantsJson(req)) return Response.json({ id: doc.id, status: doc.status });
    return new Response(null, { status: 303, headers: { location: `/cours/${doc.id}` } });
  } catch (err) {
    const res = errorResponse(err);
    if (res) {
      if (wantsJson(req)) return res;
      const body = (await res.json()) as { error: string; message?: string };
      // Les refus d'upload portent une raison précise (taille, type, contenu) pour un message utile à l'écran.
      if (body.error === "invalid" && body.message?.startsWith("upload_")) body.error = body.message.slice(7);
      return new Response(null, { status: 303, headers: { location: `/cours?erreur=${encodeURIComponent(body.error)}` } });
    }
    console.error("[documents]", err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
