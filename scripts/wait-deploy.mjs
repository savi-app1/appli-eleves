// Attend la fin du déploiement (Netlify ou autre plateforme reliée à GitHub) pour un commit donné, puis affiche l'URL.
// Deux sources : les statuts/déploiements GitHub posés par la plateforme, et — si une URL est connue — le point de
// santé du site lui-même (`/api/sante` expose le commit construit hors production).
//   GITHUB_TOKEN=… GITHUB_REPOSITORY=owner/repo node scripts/wait-deploy.mjs <sha> [timeout_minutes] [url_attendue]
const [sha, minutes = "20", expectedUrl] = process.argv.slice(2);
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!sha || !repo || !token) {
  console.error("Usage : GITHUB_TOKEN et GITHUB_REPOSITORY requis, puis <sha> [timeout_minutes] [url_attendue]");
  process.exit(2);
}
const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "savi-wait-deploy" };
const api = async (path) => {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
};
const started = Date.now();
const deadline = started + Number(minutes) * 60_000;
let lastSeen = "";
let healthyWithoutCommitSince = 0;

async function siteBuiltFromCommit(url) {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/sante`, { signal: AbortSignal.timeout(30_000) });
    const body = await res.json().catch(() => ({}));
    const build = typeof body.build === "string" ? JSON.parse(body.build) : null;
    if (build?.commit) return { known: true, match: String(build.commit).startsWith(sha) || sha.startsWith(String(build.commit)), ok: body.ok === true };
    return { known: false, ok: body.ok === true };
  } catch {
    return { known: false, ok: false };
  }
}

while (Date.now() < deadline) {
  // 1. statuts de commit (Netlify : contexte « netlify/<site>/deploy-preview »)
  const { statuses = [] } = await api(`/commits/${sha}/status`);
  const netlify = statuses.filter((s) => /netlify|vercel|deploy/i.test(s.context));
  const success = netlify.find((s) => s.state === "success" && s.target_url);
  if (success) {
    console.log(success.target_url);
    process.exit(0);
  }
  const failure = netlify.find((s) => s.state === "failure" || s.state === "error");
  if (failure) {
    console.error(`Déploiement en échec : ${failure.context} — ${failure.description} (${failure.target_url})`);
    process.exit(1);
  }
  // 2. déploiements GitHub (autres plateformes)
  const deployments = await api(`/deployments?sha=${sha}&per_page=10`);
  for (const d of deployments) {
    const st = await api(`/deployments/${d.id}/statuses?per_page=5`);
    const latest = st[0];
    if (!latest) continue;
    if (latest.state === "success" && (latest.environment_url || latest.target_url)) {
      console.log(latest.environment_url || latest.target_url);
      process.exit(0);
    }
    if (latest.state === "failure" || latest.state === "error") {
      console.error(`Déploiement « ${d.environment} » en échec : ${latest.description ?? ""} ${latest.log_url ?? ""}`);
      process.exit(1);
    }
  }
  // 3. le site lui-même (production Netlify : aucun statut GitHub n'est posé)
  if (expectedUrl) {
    const probe = await siteBuiltFromCommit(expectedUrl);
    if (probe.known && probe.match && probe.ok) {
      console.error(`Le site ${expectedUrl} sert bien le commit ${sha.slice(0, 7)}.`);
      console.log(expectedUrl);
      process.exit(0);
    }
    if (!probe.known && probe.ok) {
      // en production le commit n'est pas exposé : on accepte après un délai raisonnable de construction
      healthyWithoutCommitSince ||= Date.now();
      if (Date.now() - healthyWithoutCommitSince > 6 * 60_000) {
        console.error(`Le site ${expectedUrl} est sain (commit non exposé) : on le vérifie tel quel.`);
        console.log(expectedUrl);
        process.exit(0);
      }
    }
  }
  const seen = JSON.stringify(netlify.map((s) => `${s.context}:${s.state}`));
  if (seen !== lastSeen) {
    console.error(`En attente… statuts : ${seen || "aucun"}`);
    lastSeen = seen;
  }
  await new Promise((r) => setTimeout(r, 20_000));
}
console.error("Délai dépassé : aucun déploiement terminé pour ce commit.");
process.exit(1);
