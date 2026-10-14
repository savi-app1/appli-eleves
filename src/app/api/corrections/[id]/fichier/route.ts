import { getDb } from "@/db/client";
import { apiUser, isResponse } from "@/server/api-auth";
import { getSubmission } from "@/server/grading/service";
import { getStorage } from "@/server/storage";

/** Photo/PDF d'un devoir : uniquement pour son propriétaire. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const current = await apiUser();
  if (isResponse(current)) return current;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const sub = await getSubmission(db, current.user.id, id);
  if (!sub?.storageKey || !sub.mime) return new Response("Not found", { status: 404 });
  const data = await getStorage().get(sub.storageKey);
  return new Response(new Uint8Array(data), {
    headers: { "content-type": sub.mime, "content-length": String(data.byteLength), "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" },
  });
}
