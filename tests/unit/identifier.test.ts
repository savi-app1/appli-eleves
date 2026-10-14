import { describe, expect, it } from "vitest";
import { maskIdentifier, parseIdentifier } from "@/server/auth/identifier";

describe("identifiant e-mail ou téléphone", () => {
  it("normalise les e-mails", () => {
    expect(parseIdentifier("  Awa.Ouedraogo@Exemple.COM ")).toEqual({ kind: "email", value: "awa.ouedraogo@exemple.com" });
    expect(parseIdentifier("pas-un-email@")).toBeNull();
  });

  it("normalise un numéro burkinabè national au format international", () => {
    expect(parseIdentifier("70 00 00 00", "BF")).toEqual({ kind: "phone", value: "+22670000000" });
    expect(parseIdentifier("+226 70 00 00 00")).toEqual({ kind: "phone", value: "+22670000000" });
    expect(parseIdentifier("0022670000000")).toEqual({ kind: "phone", value: "+22670000000" });
  });

  it("utilise l'indicatif du pays choisi", () => {
    expect(parseIdentifier("0700000000", "CI")).toEqual({ kind: "phone", value: "+225700000000" });
    expect(parseIdentifier("77 000 00 00", "SN")).toEqual({ kind: "phone", value: "+221770000000" });
  });

  it("rejette les valeurs invalides", () => {
    expect(parseIdentifier("")).toBeNull();
    expect(parseIdentifier("123")).toBeNull();
    expect(parseIdentifier("abc")).toBeNull();
  });

  it("masque l'identifiant pour les journaux", () => {
    expect(maskIdentifier({ kind: "email", value: "awa@exemple.com" })).toBe("aw***@exemple.com");
    expect(maskIdentifier({ kind: "phone", value: "+22670000000" })).toBe("+2267*****00");
  });
});
