import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3StorageProvider, s3ConfigFromEnv } from "./s3";
import { NetlifyBlobsStorageProvider } from "./netlify-blobs";

/**
 * Stockage des fichiers importés (PDF, photos de devoirs, cours).
 *  - En développement : système de fichiers local (./.data/uploads), jamais servi directement.
 *  - En production : un stockage objet compatible S3 (Cloudflare R2, Backblaze B2, AWS S3) via la même interface.
 * Les fichiers ne sont JAMAIS exposés par URL publique : toute lecture passe par une route qui vérifie
 * que l'utilisateur connecté est bien le propriétaire du document.
 */
export interface StoredObject {
  key: string;
  size: number;
  sha256: string;
}

export interface StorageProvider {
  readonly name: string;
  put(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export const ALLOWED_UPLOADS = {
  "application/pdf": { ext: "pdf", magic: [Buffer.from("%PDF")] },
  "image/jpeg": { ext: "jpg", magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  "image/png": { ext: "png", magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])] },
  "image/webp": { ext: "webp", magic: [Buffer.from("RIFF")] },
} as const;
export type AllowedMime = keyof typeof ALLOWED_UPLOADS;

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;

export type UploadValidation = { ok: true; mime: AllowedMime } | { ok: false; reason: "too_large" | "empty" | "type_not_allowed" | "content_mismatch" };

/** Vérifie taille, type déclaré ET signature binaire réelle (un .pdf renommé en .png est refusé). */
export function validateUpload(data: Buffer, declaredMime: string): UploadValidation {
  if (data.length === 0) return { ok: false, reason: "empty" };
  if (data.length > MAX_UPLOAD_BYTES) return { ok: false, reason: "too_large" };
  const spec = (ALLOWED_UPLOADS as Record<string, { magic: readonly Buffer[] }>)[declaredMime];
  if (!spec) return { ok: false, reason: "type_not_allowed" };
  const matches = spec.magic.some((m) => data.subarray(0, m.length).equals(m));
  if (!matches) return { ok: false, reason: "content_mismatch" };
  if (declaredMime === "image/webp" && data.subarray(8, 12).toString() !== "WEBP") return { ok: false, reason: "content_mismatch" };
  return { ok: true, mime: declaredMime as AllowedMime };
}

/** Clé de stockage cloisonnée par utilisateur : users/<id>/<uuid>.<ext> — jamais dérivée du nom de fichier fourni. */
export function objectKey(userId: string, mime: AllowedMime): string {
  return `users/${userId}/${randomUUID()}.${ALLOWED_UPLOADS[mime].ext}`;
}

function safeJoin(root: string, key: string): string {
  const resolved = path.resolve(root, key);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw new Error("storage: clé invalide");
  return resolved;
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  constructor(private readonly root = process.env.UPLOADS_DIR ?? "./.data/uploads") {}
  async put(key: string, data: Buffer, _contentType: string): Promise<StoredObject> {
    void _contentType; // le type MIME servira au fournisseur S3 (métadonnée Content-Type)
    const file = safeJoin(this.root, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data, { flag: "wx" });
    return { key, size: data.length, sha256: createHash("sha256").update(data).digest("hex") };
  }
  async get(key: string): Promise<Buffer> {
    return readFile(safeJoin(this.root, key));
  }
  async delete(key: string): Promise<void> {
    await rm(safeJoin(this.root, key), { force: true });
  }
}

let provider: StorageProvider | undefined;
/** Sélection par variable d'environnement : STORAGE_PROVIDER=local (défaut, disque du serveur) | s3 (R2, B2, S3, MinIO — bucket privé) | netlify-blobs (hébergement Netlify). */
export function getStorage(): StorageProvider {
  if (provider) return provider;
  const kind = process.env.STORAGE_PROVIDER ?? "local";
  if (kind === "local") provider = new LocalStorageProvider();
  else if (kind === "s3") {
    const cfg = s3ConfigFromEnv();
    if (!cfg) throw new Error("STORAGE_PROVIDER=s3 : S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY sont requis.");
    provider = new S3StorageProvider(cfg);
  } else if (kind === "netlify-blobs") provider = new NetlifyBlobsStorageProvider();
  else throw new Error(`STORAGE_PROVIDER=${kind} inconnu (local | s3 | netlify-blobs).`);
  return provider;
}
