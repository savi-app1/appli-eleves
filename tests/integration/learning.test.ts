import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { conversations, messages, subscriptions, type User } from "@/db/schema";
import { register } from "@/server/auth/account";
import { PremiumRequiredError } from "@/server/billing/entitlement";
import { STRICT_MISSING_SENTENCE } from "@/server/ai/schemas";
import { askTutor, listConversations, loadUiMessages, setPinned } from "@/server/tutor/service";
import { deleteDocument, generateOutput, getDocument, listDocuments, uploadDocument } from "@/server/documents/service";
import { searchChunks, searchDocuments } from "@/server/documents/search";
import { chunkPages } from "@/server/documents/extract";
import { generateQuiz, isCorrect, normalizeShort, submitAttempt } from "@/server/quiz/service";
import { createSubmission, gradeSubmission } from "@/server/grading/service";
import { getProgress } from "@/server/progress/service";
import { DAILY_LIMITS, QuotaExceededError, usageToday } from "@/server/ai/guard";
import { createTestDb } from "../helpers/db";

let db: Db;
let close: () => Promise<void>;
let awa: User;
let issa: User;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  awa = (await register(db, { identifier: "awa@exemple.com", password: "Secret-Awa-2026", firstName: "Awa", level: "3e", country: "BF", consent: true })).user;
  issa = (await register(db, { identifier: "issa@exemple.com", password: "Secret-Issa-2026", firstName: "Issa", level: "tle", country: "BF", consent: true })).user;
});
afterAll(async () => {
  await close();
  await rm("./.data/test-uploads", { recursive: true, force: true });
});

async function consume(result: Awaited<ReturnType<typeof askTutor>>["result"]) {
  let text = "";
  for await (const chunk of result.textStream) text += chunk;
  await result.text; // attend onFinish
  return text;
}

describe("tuteur", () => {
  it("crée la conversation, enregistre la question puis la réponse diffusée en flux", async () => {
    const { result, conversationId } = await askTutor(db, awa, { text: "Explique-moi le théorème de Pythagore" });
    const text = await consume(result);
    expect(text).toMatch(/hypoténuse/i);
    const rows = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
    expect(rows.map((r) => r.role)).toEqual(["user", "assistant"]);
    expect(rows[1].content).toBe(text);
    expect(rows[1].model).toBe("mock:simule");
    const convs = await listConversations(db, awa.id);
    expect(convs[0].title).toBe("Explique-moi le théorème de Pythagore");
  });

  it("« explique autrement » s'appuie sur la question précédente de la même conversation", async () => {
    const convs = await listConversations(db, awa.id);
    const { result } = await askTutor(db, awa, { conversationId: convs[0].id, text: "", intent: "explainAgain" });
    const text = await consume(result);
    expect(text).toMatch(/carré|aires/i);
    const ui = await loadUiMessages(db, awa.id, convs[0].id);
    expect(ui.length).toBe(4);
  });

  it("refuse l'accès à la conversation d'un autre utilisateur", async () => {
    const convs = await listConversations(db, awa.id);
    await expect(askTutor(db, issa, { conversationId: convs[0].id, text: "Bonjour" })).rejects.toMatchObject({ name: "NotFoundError" });
    expect(await loadUiMessages(db, issa.id, convs[0].id)).toEqual([]);
    await setPinned(db, issa.id, convs[0].id, true);
    const [c] = await db.select().from(conversations).where(eq(conversations.id, convs[0].id));
    expect(c.pinned).toBe(false);
  });

  it("bloque le tuteur quand l'essai est expiré", async () => {
    await db.update(subscriptions).set({ trialEndsAt: new Date(Date.now() - 1000) }).where(eq(subscriptions.userId, issa.id));
    await expect(askTutor(db, issa, { text: "Bonjour" })).rejects.toBeInstanceOf(PremiumRequiredError);
    await db.update(subscriptions).set({ trialEndsAt: new Date(Date.now() + 86_400_000) }).where(eq(subscriptions.userId, issa.id));
  });
});

describe("documents et mode strict", () => {
  let docId: string;

  it("importe un PDF, extrait le texte et l'indexe en extraits", async () => {
    const doc = await uploadDocument(db, awa, { buffer: readFileSync("tests/fixtures/cours-pythagore.pdf"), declaredMime: "application/pdf", filename: "cours-pythagore.pdf", title: "Cours Pythagore (3e)", chapter: "Pythagore" });
    expect(doc?.status).toBe("ready");
    expect(doc?.pages).toBe(2);
    docId = doc!.id;
    const hits = await searchChunks(db, awa.id, [docId], "Qu'est-ce que l'hypoténuse ?");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].content).toMatch(/hypotenuse/i);
    const found = await searchDocuments(db, awa.id, "réciproque");
    expect(found.length).toBeGreaterThan(0);
  });

  it("refuse un fichier dont le contenu ne correspond pas au type", async () => {
    await expect(uploadDocument(db, awa, { buffer: Buffer.from("<html>pas un pdf</html>"), declaredMime: "application/pdf", filename: "x.pdf" })).rejects.toMatchObject({ name: "ValidationError" });
  });

  it("mode strict : répond à partir des extraits, et signale clairement ce qui n'y figure pas", async () => {
    const ok = await askTutor(db, awa, { text: "Quel est le côté le plus long du triangle rectangle ?", strict: true, documentIds: [docId] });
    const okText = await consume(ok.result);
    expect(ok.sources.length).toBeGreaterThan(0);
    expect(okText).toMatch(/\[\d\]/);
    const rows = await db.select().from(messages).where(eq(messages.conversationId, ok.conversationId));
    expect(rows.find((r) => r.role === "assistant")?.sources).toBeTruthy();

    const ko = await askTutor(db, awa, { text: "Explique la photosynthèse chez les plantes vertes", strict: true, documentIds: [docId] });
    const koText = await consume(ko.result);
    expect(koText).toContain(STRICT_MISSING_SENTENCE);
  });

  it("un autre utilisateur ne peut ni voir ni utiliser ce document", async () => {
    expect(await getDocument(db, issa.id, docId)).toBeNull();
    expect(await listDocuments(db, issa.id)).toEqual([]);
    const r = await askTutor(db, issa, { text: "Qu'est-ce que l'hypoténuse ?", strict: true, documentIds: [docId] });
    expect(r.sources).toEqual([]);
    await consume(r.result);
  });

  it("génère une fiche de révision à partir du document", async () => {
    const out = await generateOutput(db, awa, docId, "summary");
    expect(out.kind).toBe("summary");
    expect(out.content).toMatch(/L'essentiel/);
  });

  it("découpe le texte en extraits avec chevauchement", () => {
    const chunks = chunkPages(["Phrase une. ".repeat(200)], 300, 40);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.content.length <= 360)).toBe(true);
  });

  it("supprime le document et ses extraits", async () => {
    await deleteDocument(db, awa.id, docId);
    expect(await getDocument(db, awa.id, docId)).toBeNull();
    expect(await searchChunks(db, awa.id, [docId], "hypoténuse")).toEqual([]);
  });
});

describe("quiz", () => {
  it("normalise les réponses courtes", () => {
    expect(normalizeShort(" x = 4 ")).toBe("4");
    expect(normalizeShort("10 cm")).toBe("10");
    expect(normalizeShort("Été")).toBe("ete");
    expect(isCorrect({ id: "a", type: "short", prompt: "?", accepted: ["x²-9"], explanation: "" }, "x^2 - 9")).toBe(true);
    expect(isCorrect({ id: "b", type: "mcq", prompt: "?", options: ["a", "b"], answer: 1, explanation: "" }, "1")).toBe(false);
  });

  it("génère un quiz structuré et corrige la tentative côté serveur", async () => {
    const quiz = await generateQuiz(db, awa, { subject: "Mathématiques", topic: "Théorème de Pythagore", count: 5 });
    expect(quiz.questions.length).toBe(5);
    expect(quiz.questions.every((q) => q.id && q.explanation)).toBe(true);
    const answers: Record<string, number | boolean | string> = {};
    for (const q of quiz.questions) answers[q.id] = q.type === "mcq" ? q.answer : q.type === "truefalse" ? q.answer : q.accepted[0];
    const first = quiz.questions[0];
    answers[first.id] = first.type === "mcq" ? (first.answer + 1) % first.options.length : first.type === "truefalse" ? !first.answer : "mauvaise";
    const res = await submitAttempt(db, awa.id, { quizId: quiz.id, answers, durationS: 90 });
    expect(res.score).toBe(4);
    expect(res.total).toBe(5);
    expect(res.detail[0].correct).toBe(false);
    await expect(submitAttempt(db, issa.id, { quizId: quiz.id, answers })).rejects.toMatchObject({ name: "NotFoundError" });
  });
});

describe("correction de devoirs", () => {
  it("lit un texte saisi, repère l'erreur et ne note pas sans barème", async () => {
    const sub = await createSubmission(db, awa, { text: "Exercice 2 : Résoudre 3x − 7 = 2x + 5\nRéponse : 3x − 2x = 5 − 7\nx = −2", subject: "Mathématiques" });
    expect(sub.status).toBe("recognized");
    const g = await gradeSubmission(db, awa, sub.id);
    expect(g.errors.length).toBe(1);
    expect(g.grade).toBeNull();
    expect(g.steps.join(" ")).toMatch(/12/);
  });

  it("donne une note indicative uniquement quand l'élève déclare un barème", async () => {
    const sub = await createSubmission(db, awa, { text: "Résoudre 3x − 7 = 2x + 5. Réponse : x = −2", hasScale: true, outOf: 10 });
    const g = await gradeSubmission(db, awa, sub.id);
    expect(g.grade?.outOf).toBe(10);
    expect(g.grade!.value).toBeLessThan(10);
  });

  it("lit une photo de devoir par OCR local si les données Tesseract sont présentes", async () => {
    const { ocrAvailable } = await import("@/server/documents/extract");
    if (!(await ocrAvailable())) return;
    const sub = await createSubmission(db, awa, { file: { buffer: readFileSync("tests/fixtures/devoir-equation.png"), declaredMime: "image/png" } });
    expect(sub.recognizedText).toMatch(/3x/);
    expect(sub.confidence).toBeGreaterThan(50);
  }, 60_000);
});

describe("progression et quotas", () => {
  it("agrège questions, quiz, corrections et série de jours", async () => {
    const p = await getProgress(db, awa.id);
    expect(p.stats.questions).toBeGreaterThanOrEqual(4);
    expect(p.stats.quizzes).toBe(1);
    expect(p.stats.gradings).toBe(2);
    expect(p.overallPercent).toBe(80);
    expect(p.streakDays).toBe(1);
    expect(p.weekActivity[6]).toBeGreaterThan(0);
    expect(p.bySubject[0].subject).toBe("Mathématiques");
  });

  it("applique le plafond journalier de corrections", async () => {
    const sub = await createSubmission(db, issa, { text: "Résoudre 2x + 5 = 13. Réponse : x = 4" });
    const used = await usageToday(db, issa.id, "gradings");
    for (let i = used; i < DAILY_LIMITS.gradings; i++) await gradeSubmission(db, issa, sub.id);
    await expect(gradeSubmission(db, issa, sub.id)).rejects.toBeInstanceOf(QuotaExceededError);
  }, 60_000);
});
