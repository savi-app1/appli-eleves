import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { LocalStorageProvider, objectKey, validateUpload } from "@/server/storage";

const dir = await mkdtemp(path.join(tmpdir(), "savi-storage-"));
afterAll(() => rm(dir, { recursive: true, force: true }));

describe("validation des fichiers importés", () => {
  it("accepte un PDF et une image dont la signature correspond au type déclaré", () => {
    expect(validateUpload(Buffer.from("%PDF-1.7 ..."), "application/pdf")).toEqual({ ok: true, mime: "application/pdf" });
    expect(validateUpload(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]), "image/jpeg")).toEqual({ ok: true, mime: "image/jpeg" });
  });
  it("refuse un type non autorisé, un contenu qui ne correspond pas, ou un fichier vide", () => {
    expect(validateUpload(Buffer.from("MZ..."), "application/x-msdownload")).toMatchObject({ ok: false, reason: "type_not_allowed" });
    expect(validateUpload(Buffer.from("<html>"), "image/png")).toMatchObject({ ok: false, reason: "content_mismatch" });
    expect(validateUpload(Buffer.alloc(0), "application/pdf")).toMatchObject({ ok: false, reason: "empty" });
  });
});

describe("stockage local cloisonné", () => {
  const storage = new LocalStorageProvider(dir);
  it("écrit, relit et supprime sous une clé propre à l'utilisateur", async () => {
    const key = objectKey("user-123", "application/pdf");
    expect(key.startsWith("users/user-123/")).toBe(true);
    const obj = await storage.put(key, Buffer.from("%PDF-1.7 test"), "application/pdf");
    expect(obj.size).toBe(13);
    expect((await storage.get(key)).toString()).toBe("%PDF-1.7 test");
    await storage.delete(key);
    await expect(storage.get(key)).rejects.toThrow();
  });
  it("bloque toute tentative de sortie du dossier racine", async () => {
    await expect(storage.get("../../etc/passwd")).rejects.toThrow(/clé invalide/);
  });
});
