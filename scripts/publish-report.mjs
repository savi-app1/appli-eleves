// Publie un rapport (fichier Markdown) comme « check run » GitHub sur le commit courant, afin qu'il soit lisible
// via l'API même quand les journaux détaillés d'Actions ne sont pas accessibles.
//   GITHUB_TOKEN=… GITHUB_REPOSITORY=owner/repo GITHUB_SHA=… node scripts/publish-report.mjs <fichier.md> <nom> <success|failure>
import { readFileSync } from "node:fs";
const [file, name = "Rapport de vérification", conclusion = "neutral"] = process.argv.slice(2);
const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo, GITHUB_SHA: sha } = process.env;
if (!file || !token || !repo || !sha) {
  console.error("Usage : GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA requis, puis <fichier.md> [nom] [conclusion]");
  process.exit(2);
}
let text = "";
try {
  text = readFileSync(file, "utf8");
} catch {
  text = "(aucun rapport produit)";
}
const clip = (s, n) => (s.length > n ? `${s.slice(0, n / 2)}\n\n… (tronqué) …\n\n${s.slice(-n / 2)}` : s);
const res = await fetch(`https://api.github.com/repos/${repo}/check-runs`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json", "user-agent": "savi-report" },
  body: JSON.stringify({
    name,
    head_sha: sha,
    status: "completed",
    conclusion,
    output: { title: `${name} — ${conclusion}`, summary: clip(text, 60_000).slice(0, 65_000), text: clip(text, 60_000) },
  }),
});
console.log(`Rapport publié : ${res.status}`);
if (!res.ok) console.error(await res.text());
