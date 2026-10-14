// Crée des comptes (ex. l'administrateur initial) sur un site SAVI déployé, avec des mots de passe aléatoires,
// puis imprime ces mots de passe chiffrés avec une clé publique RSA (seul le détenteur de la clé privée peut les lire :
// rien de secret n'apparaît en clair dans les journaux).
//   node scripts/creer-comptes.mjs <url> <clé_publique_PEM_base64> <identifiant[:prénom[:niveau]]> [...]
import { publicEncrypt, constants, randomBytes } from "node:crypto";

const [url, pubKeyB64, ...accounts] = process.argv.slice(2);
if (!url || !pubKeyB64 || accounts.length === 0) {
  console.error("Usage : node scripts/creer-comptes.mjs <url> <clé_publique_base64> <identifiant[:prénom[:niveau]]>…");
  process.exit(2);
}
const base = url.replace(/\/$/, "");
const publicKey = Buffer.from(pubKeyB64, "base64").toString("utf8");

const unescapeHtml = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const fieldsOf = (fragment) => {
  const out = {};
  for (const m of fragment.matchAll(/<input[^>]*name="([^"]*)"[^>]*>/g)) {
    const v = /value="([^"]*)"/.exec(m[0]);
    out[m[1]] = v ? unescapeHtml(v[1]) : "";
  }
  return out;
};
const password = () => `Savi-${randomBytes(9).toString("base64url")}`;

const results = {};
for (const spec of accounts) {
  const [identifier, firstName = "Équipe SAVI", level = "Tle"] = spec.split(":");
  const page = await fetch(`${base}/inscription`, { redirect: "manual" });
  const html = await page.text();
  const form = (html.match(/<form[^>]*>[\s\S]*?<\/form>/g) ?? []).find((f) => f.includes('name="identifier"'));
  if (!form) throw new Error("Formulaire d'inscription introuvable");
  const pw = password();
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...fieldsOf(form), firstName, identifier, password: pw, level, country: "BF", consent: "on" })) fd.append(k, v);
  const res = await fetch(`${base}/inscription`, { method: "POST", body: fd, redirect: "manual", headers: { origin: base, accept: "text/html" } });
  const location = res.headers.get("location");
  if (res.status === 303 && location === "/accueil") {
    results[identifier] = pw;
    console.log(`✓ compte créé : ${identifier}`);
  } else {
    const body = await res.text();
    const already = /existe déjà/.test(body);
    console.log(`✗ ${identifier} : ${already ? "existe déjà (non modifié)" : `échec HTTP ${res.status}`}`);
  }
}
const payload = JSON.stringify(results);
const encrypted = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(payload, "utf8"));
console.log(`MOTS_DE_PASSE_CHIFFRES=${encrypted.toString("base64")}`);
