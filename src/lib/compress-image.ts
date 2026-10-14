/**
 * Compression côté navigateur des photos avant envoi (réseaux mobiles lents) :
 * redimensionne au plus à `maxSide` pixels et ré-encode en JPEG. Conserve le fichier d'origine si la
 * compression n'apporte rien ou si le navigateur ne le permet pas. Les PDF ne sont jamais touchés.
 */
export interface CompressOptions {
  maxSide?: number;
  quality?: number;
  /** En dessous de cette taille, on n'y touche pas. */
  minBytes?: number;
}

export async function compressImage(file: File, { maxSide = 1600, quality = 0.82, minBytes = 300 * 1024 }: CompressOptions = {}): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < minBytes) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size * 0.9) return file;
    const name = file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** Remplace le fichier sélectionné d'un champ <input type="file"> (nécessaire pour un envoi de formulaire classique). */
export function setInputFile(input: HTMLInputElement | null, file: File) {
  if (!input || typeof DataTransfer === "undefined") return;
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  } catch {
    /* navigateurs anciens : le fichier d'origine sera envoyé */
  }
}
