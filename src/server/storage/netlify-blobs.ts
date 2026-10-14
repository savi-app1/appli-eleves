import { createHash } from "node:crypto";
import type { Store } from "@netlify/blobs";
import type { StorageProvider, StoredObject } from "./index";

/**
 * Stockage dans Netlify Blobs (quand l'application est hébergée sur Netlify) : magasin privé, accessible uniquement
 * depuis les fonctions du site ; aucun identifiant à configurer, le contexte est injecté par la plateforme.
 */
export class NetlifyBlobsStorageProvider implements StorageProvider {
  readonly name = "netlify-blobs";
  private storePromise?: Promise<Store>;

  private store(): Promise<Store> {
    this.storePromise ??= import("@netlify/blobs").then((m) => m.getStore({ name: process.env.NETLIFY_BLOBS_STORE ?? "savi-fichiers", consistency: "strong" }));
    return this.storePromise;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    const store = await this.store();
    await store.set(key, new Blob([new Uint8Array(data)], { type: contentType }), { metadata: { contentType } });
    return { key, size: data.length, sha256: createHash("sha256").update(data).digest("hex") };
  }

  async get(key: string): Promise<Buffer> {
    const store = await this.store();
    const found = await store.get(key, { type: "arrayBuffer" });
    if (!found) throw Object.assign(new Error(`Fichier introuvable : ${key}`), { code: "ENOENT" });
    return Buffer.from(found);
  }

  async delete(key: string): Promise<void> {
    const store = await this.store();
    await store.delete(key);
  }
}
