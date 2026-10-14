import { access } from "node:fs/promises";
import path from "node:path";
import { aiMode, getModel } from "@/server/ai/provider";

export interface ExtractedText {
  pages: string[];
  method: "pdf-text" | "ocr-tesseract" | "ocr-vision" | "none";
  confidence: number | null;
  warning?: string;
}

const TESSDATA_DIR = process.env.TESSDATA_DIR ?? path.resolve(process.cwd(), ".data/tessdata");
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS ?? 60_000);

export async function ocrAvailable(): Promise<boolean> {
  try {
    await access(path.join(TESSDATA_DIR, "fra.traineddata"));
    return true;
  } catch {
    return false;
  }
}

/** OCR local (Tesseract, WebAssembly) : gratuit, hors-ligne, correct sur du texte imprimé, faible sur l'écriture manuscrite. */
async function ocrTesseract(buffer: Buffer): Promise<ExtractedText> {
  const { createWorker } = await import("tesseract.js");
  // Garde-fou : un worker qui ne démarre pas (module absent, mémoire) ne doit jamais bloquer la requête.
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("ocr_timeout")), OCR_TIMEOUT_MS).unref?.());
  const worker = await Promise.race([createWorker("fra", 1, { langPath: TESSDATA_DIR, cacheMethod: "none", gzip: false }), timeout]);
  try {
    const { data } = await Promise.race([worker.recognize(buffer), timeout]);
    const text = data.text.replace(/[ \t]+\n/g, "\n").trim();
    return { pages: [text], method: "ocr-tesseract", confidence: Math.round(data.confidence), warning: data.confidence < 60 ? "Lecture incertaine : vérifie le texte reconnu." : undefined };
  } finally {
    worker.terminate().catch(() => {});
  }
}

/** Lecture par modèle multimodal (Claude, GPT-4o…) : bien meilleure sur les photos de cahier et l'écriture manuscrite. */
async function ocrVision(buffer: Buffer, mime: string): Promise<ExtractedText> {
  const { generateText } = await import("ai");
  const model = await getModel("strong");
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Retranscris fidèlement tout le texte de cette image (énoncé, calculs, réponses manuscrites), ligne par ligne, sans commenter ni corriger. Si une partie est illisible, écris [illisible]." },
          { type: "file", data: buffer, mediaType: mime },
        ],
      },
    ],
    maxOutputTokens: 2000,
    temperature: 0,
  });
  return { pages: [text.trim()], method: "ocr-vision", confidence: text.includes("[illisible]") ? 70 : 90 };
}

export async function extractPdf(buffer: Buffer): Promise<ExtractedText> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = text.map((p) => p.replace(/[ \t]+/g, " ").trim());
  const chars = pages.join("").length;
  if (chars < 40) {
    return { pages, method: "none", confidence: null, warning: "Ce PDF semble scanné (pas de texte sélectionnable). Prends des photos nettes des pages et importe-les en images." };
  }
  return { pages, method: "pdf-text", confidence: 100 };
}

export async function extractImage(buffer: Buffer, mime: string): Promise<ExtractedText> {
  if (aiMode() === "live") {
    try {
      return await ocrVision(buffer, mime);
    } catch {
      /* repli sur l'OCR local */
    }
  }
  if (await ocrAvailable()) return ocrTesseract(buffer);
  return { pages: [], method: "none", confidence: null, warning: "Lecture d'image indisponible : ni modèle de vision configuré, ni données OCR locales (npm run ocr:setup)." };
}

export async function extractAny(buffer: Buffer, mime: string): Promise<ExtractedText> {
  return mime === "application/pdf" ? extractPdf(buffer) : extractImage(buffer, mime);
}

/** Découpe en extraits d'environ 700 caractères, en respectant les phrases, avec un léger chevauchement. */
export function chunkPages(pages: string[], target = 700, overlap = 80): Array<{ page: number; idx: number; content: string }> {
  const out: Array<{ page: number; idx: number; content: string }> = [];
  let idx = 0;
  pages.forEach((pageText, p) => {
    const clean = pageText.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const sentences = clean.split(/(?<=[.!?;:])\s+/);
    let buf = "";
    for (const s of sentences) {
      if ((buf + " " + s).trim().length > target && buf) {
        out.push({ page: p + 1, idx: idx++, content: buf.trim() });
        buf = buf.slice(Math.max(0, buf.length - overlap)) + " " + s;
      } else {
        buf = (buf + " " + s).trim();
      }
    }
    if (buf.trim().length > 20) out.push({ page: p + 1, idx: idx++, content: buf.trim() });
  });
  return out;
}
