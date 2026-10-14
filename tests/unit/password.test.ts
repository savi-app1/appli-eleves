import { describe, expect, it } from "vitest";
import { hashPassword, passwordPolicyError, verifyPassword } from "@/server/auth/password";

describe("mots de passe (scrypt)", () => {
  it("hache et vérifie un mot de passe", async () => {
    const hash = await hashPassword("Secret-Awa-2026");
    expect(hash.startsWith("scrypt$131072$8$1$")).toBe(true);
    expect(await verifyPassword("Secret-Awa-2026", hash)).toBe(true);
    expect(await verifyPassword("secret-awa-2026", hash)).toBe(false);
  });

  it("produit des hachés différents pour le même mot de passe (sel aléatoire)", async () => {
    const a = await hashPassword("motdepasse1");
    const b = await hashPassword("motdepasse1");
    expect(a).not.toBe(b);
  });

  it("rejette les formats inconnus sans lever d'exception", async () => {
    expect(await verifyPassword("x", "bcrypt$abc")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });

  it("applique la politique de longueur", () => {
    expect(passwordPolicyError("court")).toBe("password_too_short");
    expect(passwordPolicyError("        ")).toBe("password_too_short");
    expect(passwordPolicyError("a".repeat(129))).toBe("password_too_long");
    expect(passwordPolicyError("huitcar8")).toBeNull();
  });
});
