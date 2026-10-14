/** Mini client HTTP avec cookies pour les tests de bout en bout (sans navigateur). */
export class Client {
  private cookies = new Map<string, string>();
  constructor(public readonly base: string) {}

  private cookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  private storeCookies(res: Response) {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const line of set) {
      const [pair, ...attrs] = line.split(";");
      const idx = pair.indexOf("=");
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      const expired = attrs.some((a) => /max-age=0/i.test(a.trim()) || /expires=Thu, 01 Jan 1970/i.test(a.trim()));
      if (expired || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async request(path: string, init: RequestInit & { origin?: boolean } = {}) {
    const headers = new Headers(init.headers);
    if (this.cookies.size) headers.set("cookie", this.cookieHeader());
    if (init.method && init.method !== "GET" && init.origin !== false && !headers.has("origin")) headers.set("origin", this.base);
    const res = await fetch(this.base + path, { ...init, headers, redirect: "manual" });
    this.storeCookies(res);
    return res;
  }

  async get(path: string) {
    const res = await this.request(path);
    return { status: res.status, location: res.headers.get("location"), body: await res.text(), headers: res.headers };
  }

  async postForm(path: string, fields: Record<string, string>, files: Record<string, { name: string; type: string; data: Uint8Array }> = {}) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    for (const [k, f] of Object.entries(files)) fd.append(k, new Blob([f.data as BlobPart], { type: f.type }), f.name);
    const res = await this.request(path, { method: "POST", body: fd, headers: { accept: "text/html" } });
    return { status: res.status, location: res.headers.get("location"), body: await res.text(), headers: res.headers };
  }

  async postJson(path: string, obj: unknown, extra: Record<string, string> = {}) {
    const res = await this.request(path, { method: "POST", body: JSON.stringify(obj), headers: { "content-type": "application/json", ...extra } });
    return { status: res.status, body: await res.text(), headers: res.headers };
  }

  /** Champs cachés d'un formulaire (identifiant d'action serveur inclus) pour l'envoyer sans JavaScript. */
  async actionFields(path: string, mustContain?: string, idx = 0) {
    const { body } = await this.get(path);
    return formFields(body, mustContain, idx);
  }

  logoutCookies() {
    this.cookies.clear();
  }
}

export function forms(html: string, mustContain?: string): string[] {
  const all = html.match(/<form[^>]*>[\s\S]*?<\/form>/g) ?? [];
  return mustContain ? all.filter((f) => f.includes(mustContain)) : all;
}

export function fieldsOf(fragment: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of fragment.matchAll(/<input[^>]*name="([^"]*)"[^>]*>/g)) {
    const v = /value="([^"]*)"/.exec(m[0]);
    out[m[1]] = v ? unescapeHtml(v[1]) : "";
  }
  return out;
}

export function formFields(html: string, mustContain?: string, idx = 0) {
  const f = forms(html, mustContain)[idx];
  if (!f) throw new Error(`Formulaire introuvable${mustContain ? ` (contenant ${mustContain})` : ""}`);
  return fieldsOf(f);
}

export function unescapeHtml(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** Texte visible approximatif d'une page HTML. */
export function text(html: string) {
  return unescapeHtml(html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Concatène les morceaux de texte d'un flux SSE du SDK IA. */
export function sseText(body: string) {
  let out = "";
  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const ev = JSON.parse(line.slice(6));
      if (ev.type === "text-delta" && typeof ev.delta === "string") out += ev.delta;
    } catch {}
  }
  return out;
}
