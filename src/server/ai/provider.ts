import "server-only";
import type { LanguageModel } from "ai";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { mockAnswer } from "./mock-brain";

export type Tier = "fast" | "strong";
export type AiMode = "live" | "demo";

/**
 * Fournisseur actif : anthropic (défaut recommandé), openai (ou API compatible : Mistral, Groq, OpenRouter…), mock.
 * `auto` (défaut) : anthropic si ANTHROPIC_API_KEY est présente (clé propre ou injectée par l'hébergeur, ex. passerelle IA
 * Netlify), sinon openai si OPENAI_API_KEY, sinon mock (IA simulée, affichée comme telle).
 */
export function aiProviderName(): "anthropic" | "openai" | "mock" {
  const p = (process.env.AI_PROVIDER ?? "auto").toLowerCase();
  if (p === "anthropic" || p === "openai") return p;
  if (p === "mock") return "mock";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

/** URL de base d'une API compatible (passerelle, proxy) : les SDK officiels attendent la racine, le SDK IA attend …/v1. */
function baseUrlWithV1(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.replace(/\/+$/, "");
  return /\/v1$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

/** « demo » = IA simulée (aucune clé configurée) : l'interface doit l'afficher clairement. */
export function aiMode(): AiMode {
  return aiProviderName() === "mock" ? "demo" : "live";
}

export class AiUnavailableError extends Error {
  constructor(message = "Le fournisseur d'IA n'est pas configuré.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

function modelId(tier: Tier): string {
  const p = aiProviderName();
  if (tier === "fast") return process.env.AI_MODEL_FAST ?? (p === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5");
  return process.env.AI_MODEL_STRONG ?? (p === "openai" ? "gpt-4o" : "claude-sonnet-4-5");
}

export function modelLabel(tier: Tier): string {
  return `${aiProviderName()}:${aiProviderName() === "mock" ? "simule" : modelId(tier)}`;
}

function usage(input: string, output: string) {
  const i = Math.ceil(input.length / 4);
  const o = Math.ceil(output.length / 4);
  return { inputTokens: { total: i, noCache: i, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: o, text: o, reasoning: 0 } };
}

function mockModel(): LanguageModel {
  return new MockLanguageModelV4({
    provider: "savi-mock",
    modelId: "simule",
    doGenerate: async (options) => {
      const text = mockAnswer(options);
      return {
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: usage(JSON.stringify(options.prompt), text),
        warnings: [],
      };
    },
    doStream: async (options) => {
      const text = mockAnswer(options);
      const words = text.split(/(?<=\s)/);
      const chunks: Array<{ type: "text-delta"; id: string; delta: string }> = [];
      for (let i = 0; i < words.length; i += 2) chunks.push({ type: "text-delta", id: "t1", delta: words.slice(i, i + 2).join("") });
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 350,
          chunkDelayInMs: 18,
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "t1" },
            ...chunks,
            { type: "text-end", id: "t1" },
            { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: usage(JSON.stringify(options.prompt), text) },
          ],
        }),
      };
    },
  });
}

/**
 * Modèle de langage pour une tâche. Les clés d'API ne sont lues QUE côté serveur, ici.
 *  - fast   : tuteur, fiches, quiz (coût faible, latence courte)
 *  - strong : correction de devoirs et mode strict (précision)
 */
export async function getModel(tier: Tier): Promise<LanguageModel> {
  const p = aiProviderName();
  if (p === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) throw new AiUnavailableError("ANTHROPIC_API_KEY manquante.");
    const { createAnthropic } = await import("@ai-sdk/anthropic");
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: baseUrlWithV1(process.env.ANTHROPIC_BASE_URL) })(modelId(tier));
  }
  if (p === "openai") {
    if (!process.env.OPENAI_API_KEY) throw new AiUnavailableError("OPENAI_API_KEY manquante.");
    const { createOpenAI } = await import("@ai-sdk/openai");
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: baseUrlWithV1(process.env.OPENAI_BASE_URL) })(modelId(tier));
  }
  return mockModel();
}
