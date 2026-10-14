import { z } from "zod";

/* ----------------------------------------------------------------- Quiz */

export const QuizQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mcq"),
    prompt: z.string().min(3),
    options: z.array(z.string().min(1)).min(2).max(5),
    answer: z.number().int().min(0).describe("index de la bonne option (0 = première)"),
    explanation: z.string(),
    topic: z.string().optional(),
  }),
  z.object({
    type: z.literal("truefalse"),
    prompt: z.string().min(3),
    answer: z.boolean(),
    explanation: z.string(),
    topic: z.string().optional(),
  }),
  z.object({
    type: z.literal("short"),
    prompt: z.string().min(3),
    accepted: z.array(z.string().min(1)).min(1).describe("réponses acceptées (variantes d'écriture)"),
    explanation: z.string(),
    topic: z.string().optional(),
  }),
]);
export type QuizQuestionInput = z.infer<typeof QuizQuestionSchema>;
export type QuizQuestion = QuizQuestionInput & { id: string };

export const QuizSchema = z.object({
  title: z.string().min(3).max(120),
  subject: z.string().min(2).max(60),
  questions: z.array(QuizQuestionSchema).min(1).max(25),
});
export type QuizInput = z.infer<typeof QuizSchema>;

/* -------------------------------------------------------------- Correction */

export const GradingSchema = z.object({
  transcription: z.string().describe("énoncé et production de l'élève, retranscrits fidèlement"),
  subject: z.string(),
  summary: z.string().describe("ce que demande l'exercice, en une ou deux phrases"),
  steps: z.array(z.string()).describe("résolution correcte, une étape par élément"),
  errors: z.array(z.object({ where: z.string(), what: z.string(), why: z.string() })),
  improve: z.array(z.string()),
  grade: z
    .object({ value: z.number(), outOf: z.number().positive(), comment: z.string() })
    .nullable()
    .describe("uniquement si un barème est disponible ; sinon null"),
  confidence: z.number().min(0).max(100).describe("qualité de lecture du devoir, en pourcentage"),
});
export type Grading = z.infer<typeof GradingSchema>;

/* ------------------------------------------------------------- Mode strict */

export interface SourceRef {
  n: number;
  documentId: string;
  title: string;
  page: number | null;
  excerpt: string;
}

export const STRICT_MISSING_SENTENCE = "Cette information n'est pas dans tes documents sélectionnés.";
