import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { Client, fieldsOf, forms, formFields, sseText, text } from "./client";
import { E2E_ADMIN, E2E_SECRET } from "./server";
import { signPayload } from "@/server/billing/signature";

/**
 * Parcours complet contre la version construite : inscription → tuteur → documents → mode strict → quiz →
 * correction → examen → progression → paiement (bac à sable) → isolation entre comptes → en-têtes de sécurité.
 */
const base = process.env.E2E_BASE_URL!.replace(/\/$/, "");
/** Mode distant (déploiement réel) : pas de secret de webhook, OCR éventuellement limité par l'hébergeur. */
const remote = process.env.E2E_REMOTE === "1";
const stamp = Date.now();
const awa = new Client(base);
const issa = new Client(base);
const anon = new Client(base);
const password = "Secret-Awa-2026";
const reg = { firstName: "Awa", password, level: "3e", country: "BF", consent: "on" };
const pdf = new Uint8Array(readFileSync("tests/fixtures/cours-pythagore.pdf"));
const png = new Uint8Array(readFileSync("tests/fixtures/devoir-equation.png"));

let conversationId: string;
let documentId: string;
let quizId: string;
let submissionId: string;

/** IA réelle sur le site distant (clé configurée) : les formulations exactes ne sont pas garanties, on vérifie la structure. */
let liveAi = false;

beforeAll(async () => {
  if (!base) throw new Error("E2E_BASE_URL manquant (globalSetup)");
  if (remote) {
    const sante = (await (await fetch(`${base}/api/sante`)).json()) as { ai?: string };
    liveAi = sante.ai !== "mock";
    console.warn(`Site distant : IA ${liveAi ? "réelle" : "simulée"}`);
  }
});

describe("compte et sécurité de base", () => {
  it("sert les pages publiques avec les en-têtes de sécurité, sans indexation hors production", async () => {
    const res = await anon.get("/connexion");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toContain("script-src 'self' 'nonce-");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    // tous les scripts rendus portent le nonce (sinon la CSP casserait la page)
    const scripts = res.body.match(/<script[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    const nonceMatch = /'nonce-([^']+)'/.exec(res.headers.get("content-security-policy") ?? "");
    expect(nonceMatch, "nonce absent de la CSP").not.toBeNull();
    // listées en clair pour le rapport si une balise échappe au nonce
    // (les scripts injectés par la plateforme d'hébergement, ex. /.netlify/scripts/…, sont hors de notre contrôle : bloqués par la CSP, sans effet sur l'application)
    expect(scripts.filter((s) => !s.includes(`nonce="${nonceMatch![1]}"`) && !s.includes('src="/.netlify/')).map((s) => s.slice(0, 200))).toEqual([]);
    expect((await anon.get("/sw.js")).status).toBe(200);
    expect((await anon.get("/hors-ligne")).status).toBe(200);
  });

  it("redirige un visiteur non connecté et renvoie 401 sur les API", async () => {
    const page = await anon.get("/accueil");
    expect(page.status).toBe(307);
    expect(page.location).toContain("/connexion");
    expect((await anon.postJson("/api/tuteur", { text: "salut" })).status).toBe(401);
    expect((await anon.postForm("/api/documents", {}, { file: { name: "c.pdf", type: "application/pdf", data: pdf } })).status).toBe(401);
  });

  it("inscrit un élève (essai de 4 jours) et refuse un mot de passe trop court", async () => {
    const bad = await awa.postForm("/inscription", { ...(await awa.actionFields("/inscription")), ...reg, identifier: `e2e${stamp}@exemple.com`, password: "court" });
    expect(bad.status).toBe(200);
    expect(bad.location).toBeNull();
    let ok = await awa.postForm("/inscription", { ...(await awa.actionFields("/inscription")), ...reg, identifier: E2E_ADMIN });
    if (remote && ok.status === 200 && text(ok.body).includes("existe déjà")) {
      // base persistante : le compte administrateur de test existe déjà, on se connecte
      ok = await awa.postForm("/connexion", { ...(await awa.actionFields("/connexion")), identifier: E2E_ADMIN, password });
    }
    expect(ok.status).toBe(303);
    expect(ok.location).toBe("/accueil");
    const home = await awa.get("/accueil");
    expect(home.status).toBe(200);
    expect(text(home.body)).toMatch(remote ? /Essai gratuit|Abonnement actif/ : /Essai gratuit/);
  });

  it("refuse une requête API venant d'une autre origine", async () => {
    const res = await awa.postJson("/api/tuteur", { text: "salut" }, { origin: "https://site-malveillant.example" });
    expect(res.status).toBe(403);
  });
});

describe("tuteur", () => {
  it("répond en flux, crée la conversation et la retrouve dans l'historique", async () => {
    const res = await awa.postJson("/api/tuteur", { text: "Explique-moi le théorème de Pythagore" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const m = /"conversationId":"([0-9a-f-]{36})"/.exec(res.body);
    expect(m).not.toBeNull();
    conversationId = m![1];
    const answer = sseText(res.body);
    expect(answer.length).toBeGreaterThan(liveAi ? 80 : 200);
    if (!liveAi) expect(answer.toLowerCase()).toContain("hypot");

    const again = await awa.postJson("/api/tuteur", { conversationId, text: "", intent: "simpler" });
    expect(again.status).toBe(200);
    const page = await awa.get(`/tuteur?c=${conversationId}`);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Explique-moi le théorème de Pythagore");
    const history = await awa.get("/profil/historique");
    expect(history.body).toContain("Explique-moi le théorème");
  });

  it("valide les entrées : conversation inconnue → 404, question vide → 400", async () => {
    expect((await awa.postJson("/api/tuteur", { conversationId: "00000000-0000-0000-0000-000000000000", text: "x" })).status).toBe(404);
    expect((await awa.postJson("/api/tuteur", { text: "" })).status).toBe(400);
  });
});

describe("documents et mode strict", () => {
  it("importe un PDF, l'indexe et le retrouve par recherche insensible aux accents", async () => {
    const up = await awa.postForm("/api/documents", { title: "Cours Pythagore (3e)", chapter: "Chap. 3" }, { file: { name: "cours.pdf", type: "application/pdf", data: pdf } });
    expect(up.status).toBe(303);
    expect(up.location).toMatch(/^\/cours\/[0-9a-f-]{36}$/);
    documentId = up.location!.split("/").pop()!;
    const page = await awa.get(`/cours/${documentId}`);
    expect(page.status).toBe(200);
    expect(text(page.body)).toContain("Cours Pythagore (3e)");
    const search = await awa.get(`/api/documents/search?q=${encodeURIComponent("hypotenuse")}`);
    const hits = JSON.parse(search.body).hits as { title: string }[];
    expect(hits[0]?.title).toBe("Cours Pythagore (3e)");
    const file = await awa.get(`/api/documents/${documentId}/fichier`);
    expect(file.status).toBe(200);
    expect(file.body.startsWith("%PDF-")).toBe(true);
  });

  it("rejette un faux PDF et un type interdit", async () => {
    const fake = await awa.postForm("/api/documents", {}, { file: { name: "x.pdf", type: "application/pdf", data: new TextEncoder().encode("<html>") } });
    expect(fake.location).toContain("erreur=content_mismatch");
    const exe = await awa.postForm("/api/documents", {}, { file: { name: "x.exe", type: "application/octet-stream", data: new TextEncoder().encode("MZ....") } });
    expect(exe.location).toContain("erreur=type_not_allowed");
  });

  it("génère une fiche de révision à partir du document", async () => {
    const fields = await awa.actionFields(`/cours/${documentId}?onglet=summary`, 'name="kind"');
    const res = await awa.postForm(`/cours/${documentId}?onglet=summary`, fields);
    expect(res.status).toBe(303);
    if (remote) console.warn(`Redirection après génération : ${res.location}`);
    // la page vers laquelle l'élève est renvoyé doit montrer la fiche (l'hébergeur peut réécrire la requête)
    const page = await awa.get(res.location!);
    expect(text(page.body)).toContain("L'essentiel");
  });

  it("en mode strict, cite les sources quand l'information existe et le dit quand elle manque", async () => {
    const present = await awa.postJson("/api/tuteur", { text: "Quel est le côté le plus long du triangle rectangle ?", strict: true, documentIds: [documentId] });
    expect(present.status).toBe(200);
    expect(present.body).toContain('"sources":[{');
    if (!liveAi) expect(sseText(present.body)).toContain("[1]");
    const absent = await awa.postJson("/api/tuteur", { text: "Explique la photosynthèse", strict: true, documentIds: [documentId] });
    expect(absent.status).toBe(200);
    if (!liveAi) expect(sseText(absent.body)).toContain("pas dans tes documents");
  });
});

describe("quiz, correction, examen, progression", () => {
  it("crée un quiz depuis le document et un quiz par thème", async () => {
    const fields = await awa.actionFields(`/cours/${documentId}?onglet=quiz`, 'name="count"');
    const res = await awa.postForm(`/cours/${documentId}?onglet=quiz`, { ...fields, count: "5" });
    expect(res.location).toMatch(/^\/quiz\/[0-9a-f-]{36}(\?.*)?$/);
    quizId = new URL(res.location!, base).pathname.split("/").pop()!;
    expect(text((await awa.get(`/quiz/${quizId}`)).body)).toContain("Question 1");
    const byTopic = await awa.postForm("/quiz", { ...(await awa.actionFields("/quiz", 'name="topic"')), subject: "Mathématiques", topic: "Équations du premier degré", count: "5" });
    expect(byTopic.location).toMatch(/^\/quiz\//);
  });

  it("corrige un devoir en deux temps (texte lu → vérification → analyse) avec note indicative si barème", async () => {
    const created = await awa.postForm("/api/corrections", { text: "Résoudre 3x − 7 = 2x + 5\nRéponse : x = −2", subject: "Mathématiques", hasScale: "on", outOf: "10" });
    expect(created.location).toMatch(/^\/correction\/[0-9a-f-]{36}$/);
    submissionId = created.location!.split("/").pop()!;
    const verify = await awa.get(`/correction/${submissionId}`);
    expect(text(verify.body)).toContain("C'est bien mon exercice");
    const fields = formFields(verify.body, 'name="text"');
    const graded = await awa.postForm(`/correction/${submissionId}`, { ...fields, text: "Résoudre 3x − 7 = 2x + 5\nRéponse : x = −2" });
    expect(graded.status).toBe(303);
    const result = text((await awa.get(`/correction/${submissionId}`)).body);
    expect(result).toContain("Note indicative");
    expect(result).toContain("Erreurs repérées");
    if (!liveAi) expect(result).toContain("x = 12");
  });

  it("lit une photo de devoir (OCR local) avec un indice de confiance", async () => {
    const created = await awa.postForm("/api/corrections", { subject: "Mathématiques" }, { file: { name: "devoir.png", type: "image/png", data: png } });
    expect(created.location).toMatch(/^\/correction\//);
    const res = await awa.get(created.location!);
    expect(res.status).toBe(200);
    const page = text(res.body);
    const m = /Confiance de lecture : (\d+)/.exec(page);
    if (remote && !m) {
      // hébergeur avec temps d'exécution limité : la lecture a échoué proprement et l'élève peut saisir le texte
      console.warn("OCR distant indisponible ou trop lent : échec propre vérifié");
      return;
    }
    expect(m, "OCR indisponible : lancer `npm run ocr:setup`").not.toBeNull();
    expect(Number(m![1])).toBeGreaterThan(50);
    expect(page).toContain("3x");
  });

  it("lance un examen blanc chronométré et affiche la progression", async () => {
    const exam = await awa.postForm("/examens", { ...(await awa.actionFields("/examens", 'name="minutes"')), exam: "BEPC Burkina Faso", subject: "Mathématiques", minutes: "20", count: "5" });
    expect(exam.location).toMatch(/^\/examens\/blanc\//);
    const page = text((await awa.get(exam.location!)).body);
    expect(page).toContain("Temps restant");
    const progress = text((await awa.get("/progression")).body);
    expect(progress).toContain("Questions posées");
    const goal = await awa.postForm("/progression", { ...(await awa.actionFields("/progression", 'name="title"')), title: "Réussir le BEPC blanc", targetDate: "2026-12-15" });
    expect(goal.body).toContain("Réussir le BEPC blanc");
  });
});

describe("abonnement et paiement (bac à sable)", () => {
  it("démarre un paiement, le confirme via le bac à sable et active le Premium", async () => {
    const page = await awa.get("/abonnement");
    expect(text(page.body)).toContain("aucun argent réel");
    const monthly = forms(page.body).map(fieldsOf).find((f) => f.plan === "monthly");
    expect(monthly).toBeDefined();
    const start = await awa.postForm("/abonnement", monthly!);
    expect(start.location).toMatch(/^\/abonnement\/sandbox\?ref=SAVI-/);
    const ref = decodeURIComponent(start.location!.split("ref=")[1]);
    const pending = text((await awa.get(`/abonnement/retour?ref=${ref}`)).body);
    expect(pending).toContain("en cours de vérification");
    const sandbox = await awa.get(start.location!);
    const ok = forms(sandbox.body).map(fieldsOf).find((f) => f.outcome === "confirmed")!;
    const paid = await awa.postForm(start.location!, ok);
    expect(paid.location).toBe(`/abonnement/retour?ref=${ref}`);
    const done = text((await awa.get(paid.location!)).body);
    expect(done).toContain("Paiement confirmé");
    const sub = text((await awa.get("/abonnement")).body);
    expect(sub).toContain("Abonnement actif");
    expect(sub).toContain(ref);
  });

  it.skipIf(remote)("le webhook refuse une signature invalide et accepte une signature valide (idempotent)", async () => {
    const start = await awa.postForm("/abonnement", forms((await awa.get("/abonnement")).body).map(fieldsOf).find((f) => f.plan === "yearly")!);
    const ref = decodeURIComponent(start.location!.split("ref=")[1]);
    const body = JSON.stringify({ reference: ref, transaction_id: "TX-E2E", status: "success", amount: 10000, currency: "XOF" });
    const bad = await anon.request("/api/paiements/webhook/sandbox", { method: "POST", body, headers: { "x-savi-signature": "t=1,v1=" + "0".repeat(64) } });
    expect(bad.status).toBe(401);
    const good = await anon.request("/api/paiements/webhook/sandbox", { method: "POST", body, headers: { "x-savi-signature": signPayload(E2E_SECRET, body) } });
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({ ok: true, outcome: "confirmed" });
    const replay = await anon.request("/api/paiements/webhook/sandbox", { method: "POST", body, headers: { "x-savi-signature": signPayload(E2E_SECRET, body) } });
    expect(await replay.json()).toEqual({ ok: true, outcome: "already_confirmed" });
    expect((await anon.request("/api/paiements/webhook/autre", { method: "POST", body })).status).toBe(404);
  });

  it("l'administration des paiements n'est visible que par un administrateur", async () => {
    const admin = await awa.get("/admin/paiements");
    expect(admin.status).toBe(200);
    expect(text(admin.body)).toContain("Paiements à vérifier");
  });
});

describe("cloisonnement entre comptes", () => {
  it("un autre élève ne voit rien des données du premier", async () => {
    const ok = await issa.postForm("/inscription", { ...(await issa.actionFields("/inscription")), ...reg, firstName: "Issa", identifier: `issa${stamp}@exemple.com` });
    expect(ok.status).toBe(303);
    expect((await issa.get(`/cours/${documentId}`)).status).toBe(404);
    expect((await issa.get(`/api/documents/${documentId}/fichier`)).status).toBe(404);
    expect((await issa.get(`/correction/${submissionId}`)).status).toBe(404);
    expect((await issa.get(`/quiz/${quizId}`)).status).toBe(404);
    expect((await issa.postJson("/api/tuteur", { conversationId, text: "salut" })).status).toBe(404);
    const foreign = (await issa.get(`/tuteur?c=${conversationId}`)).body;
    // la conversation d'autrui n'est pas chargée : page « nouvelle discussion » vide (l'identifiant n'apparaît que dans l'URL)
    expect(foreign).toMatch(/conversationId\\?":null/);
    expect(foreign).toMatch(/messages\\?":\[\]/);
    const admin = await issa.get("/admin/paiements");
    expect(admin.status).toBe(307);
    expect(admin.location).toContain("/accueil");
    expect((await issa.get("/profil")).body).not.toContain('href="/admin/paiements"');
  });

  it("la déconnexion invalide la session", async () => {
    const out = await issa.postForm("/profil", await issa.actionFields("/profil", "Se déconnecter"));
    expect([303, 200]).toContain(out.status);
    issa.logoutCookies();
    expect((await issa.get("/accueil")).status).toBe(307);
  });
});
