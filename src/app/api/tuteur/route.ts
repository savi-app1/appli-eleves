import { z } from "zod";
import { getDb } from "@/db/client";
import { apiUser, isResponse } from "@/server/api-auth";
import { errorResponse } from "@/server/ai/guard";
import { aiMode } from "@/server/ai/provider";
import { askTutor, MAX_QUESTION_CHARS, type TutorMetadata } from "@/server/tutor/service";

export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.string().uuid().nullish(),
  text: z.string().max(MAX_QUESTION_CHARS).default(""),
  intent: z.enum(["explainAgain", "simpler", "example", "exercise"]).nullish(),
  strict: z.boolean().optional(),
  documentIds: z.array(z.string().uuid()).max(20).optional(),
});

/**
 * Question au tuteur : réponse diffusée en flux (protocole UI Message Stream du SDK IA).
 * Les métadonnées transportent l'identifiant de conversation, le mode démo et les sources (mode strict).
 */
export async function POST(req: Request) {
  const current = await apiUser();
  if (isResponse(current)) return current;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });

  try {
    const db = await getDb();
    const { result, conversationId, sources } = await askTutor(db, current.user, parsed.data);
    const demo = aiMode() === "demo";
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }): TutorMetadata | undefined => {
        if (part.type === "start") return { conversationId, demo, sources };
        if (part.type === "finish") return { sources };
        return undefined;
      },
      onError: () => "Le tuteur n'a pas pu répondre. Réessaie dans un instant.",
    });
  } catch (err) {
    const res = errorResponse(err);
    if (res) return res;
    console.error("[tuteur]", err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
