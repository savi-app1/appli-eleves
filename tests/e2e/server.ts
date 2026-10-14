import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";

export const E2E_SECRET = "secret-e2e-webhook-savi-2026-xx";
export const E2E_ADMIN = "admin.e2e@exemple.com";

let child: ChildProcess | undefined;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      const port = typeof address === "object" && address ? address.port : 0;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function waitFor(url: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Le serveur n'a pas démarré en ${timeoutMs} ms`);
}

export default async function setup() {
  const root = process.cwd();
  // Mode distant : E2E_BASE_URL déjà défini → on teste un déploiement existant (préproduction, Netlify…) sans rien lancer.
  if (process.env.E2E_BASE_URL) {
    await waitFor(`${process.env.E2E_BASE_URL.replace(/\/$/, "")}/connexion`, 90_000);
    return async () => {};
  }
  if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
    throw new Error("Aucune version construite : lancer `npm run build` avant `npm run test:e2e`.");
  }
  const dataDir = path.join(root, ".data", "e2e-pglite");
  const uploadsDir = path.join(root, ".data", "e2e-uploads");
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(uploadsDir, { recursive: true, force: true });
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  process.env.E2E_BASE_URL = baseUrl;

  child = spawn(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_ENV: "test",
      PGLITE_DATA_DIR: dataDir,
      UPLOADS_DIR: uploadsDir,
      AI_PROVIDER: "mock",
      PAYMENT_PROVIDER: "sandbox",
      PAYMENT_WEBHOOK_SECRET: E2E_SECRET,
      ADMIN_IDENTIFIERS: E2E_ADMIN,
      TESSDATA_DIR: process.env.TESSDATA_DIR ?? path.join(root, ".data", "tessdata"),
      OCR_TIMEOUT_MS: "90000",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  let logs = "";
  child.stdout?.on("data", (d) => (logs += d.toString()));
  child.stderr?.on("data", (d) => (logs += d.toString()));
  try {
    await waitFor(`${baseUrl}/connexion`, 60_000);
  } catch (e) {
    console.error(logs);
    throw e;
  }
  return async () => {
    child?.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
    if (child && child.exitCode === null) child.kill("SIGKILL");
  };
}
