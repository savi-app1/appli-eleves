/**
 * Un compte SAVI s'identifie par e-mail OU par numéro de téléphone (usage courant en Afrique de l'Ouest).
 * Les numéros sont normalisés au format international ; l'indicatif par défaut est celui du pays choisi.
 */
const DIAL_CODES: Record<string, string> = {
  BF: "226", CI: "225", ML: "223", NE: "227", SN: "221", TG: "228", BJ: "229", GN: "224", GH: "233", NG: "234", CM: "237",
};

export type Identifier = { kind: "email"; value: string } | { kind: "phone"; value: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseIdentifier(raw: string, country = "BF"): Identifier | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("@")) {
    const email = s.toLowerCase();
    return EMAIL_RE.test(email) && email.length <= 254 ? { kind: "email", value: email } : null;
  }
  let digits = s.replace(/[\s().-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^\d{6,15}$/.test(digits)) return null;
  // Numéro national (ex. 8 chiffres au Burkina Faso) → on ajoute l'indicatif du pays.
  if (digits.length <= 10) {
    const code = DIAL_CODES[country] ?? DIAL_CODES.BF;
    if (!digits.startsWith(code)) digits = code + digits.replace(/^0+/, "");
  }
  return { kind: "phone", value: "+" + digits };
}

export function maskIdentifier(id: Identifier): string {
  if (id.kind === "email") {
    const [u, d] = id.value.split("@");
    return `${u.slice(0, 2)}***@${d}`;
  }
  return id.value.slice(0, 5) + "*****" + id.value.slice(-2);
}
