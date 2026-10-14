import { getDb } from "@/db/client";
import { apiUser, isResponse } from "@/server/api-auth";
import { errorResponse } from "@/server/ai/guard";
import { MAX_UPLOAD_BYTES } from "@/server/storage";
import { createSubmission } from "@/server/grading/service";

export const maxDuration = 120;

/** Étape 1 de la correction : réception du devoir (photo/PDF ou texte saisi) et lecture du texte. */
export async function POST(req: Request) {
  const current = await apiUser();
  if (isResponse(current)) return current;
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_UPLOAD_BYTES + 64 * 1024) return new Response(null, { status: 303, headers: { location: "/correction?erreur=too_large" } });

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "invalid" }, { status: 400 });
  const file = form.get("file");
  const text = form.get("text");
  const subject = form.get("subject");
  const outOfRaw = Number(form.get("outOf") ?? 20);

  try {
    const db = await getDb();
    const sub = await createSubmission(db, current.user, {
      file: file instanceof File && file.size > 0 ? { buffer: Buffer.from(await file.arrayBuffer()), declaredMime: file.type } : null,
      text: typeof text === "string" ? text : null,
      subject: typeof subject === "string" && subject.trim() ? subject.trim().slice(0, 60) : null,
      hasScale: form.get("hasScale") === "on",
      outOf: Number.isFinite(outOfRaw) && outOfRaw > 0 ? Math.min(100, outOfRaw) : 20,
    });
    return new Response(null, { status: 303, headers: { location: `/correction/${sub.id}` } });
  } catch (err) {
    const res = errorResponse(err);
    if (res) {
      const body = (await res.json()) as { error: string; message?: string };
      // Les refus d'upload portent une raison précise (taille, type, contenu) pour un message utile à l'écran.
      if (body.error === "invalid" && body.message?.startsWith("upload_")) body.error = body.message.slice(7);
      return new Response(null, { status: 303, headers: { location: `/correction?erreur=${encodeURIComponent(body.error)}` } });
    }
    console.error("[corrections]", err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
