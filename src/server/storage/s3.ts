import { createHash, createHmac } from "node:crypto";
import type { StorageProvider, StoredObject } from "./index";

/**
 * Stockage objet compatible S3 (Cloudflare R2, Backblaze B2, AWS S3, MinIO…) sans SDK :
 * requêtes HTTP signées (AWS Signature V4) avec `fetch`. Bucket privé obligatoire : les fichiers ne sont
 * jamais exposés par URL publique, l'application les relit et les sert après contrôle du propriétaire.
 */
export interface S3Config {
  endpoint: string; // ex. https://<compte>.r2.cloudflarestorage.com ou https://s3.eu-west-3.amazonaws.com
  bucket: string;
  region: string; // "auto" pour R2
  accessKeyId: string;
  secretAccessKey: string;
  /** style « chemin » (https://endpoint/bucket/clé) — recommandé pour R2/MinIO ; sinon sous-domaine du bucket */
  pathStyle: boolean;
}

export function s3ConfigFromEnv(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint: endpoint.replace(/\/$/, ""), bucket, region: process.env.S3_REGION?.trim() || "auto", accessKeyId, secretAccessKey, pathStyle: process.env.S3_FORCE_PATH_STYLE !== "0" };
}

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();

/** Encodage URI « strict » exigé par SigV4 (RFC 3986, `/` conservé dans les chemins). */
export function uriEncode(value: string, keepSlash = false) {
  const encoded = encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return keepSlash ? encoded.replace(/%2F/g, "/") : encoded;
}

export interface SignInput {
  method: string;
  url: URL;
  headers: Record<string, string>; // doit contenir host
  payloadHash: string;
  date: Date;
  region: string;
  service?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** Calcule l'en-tête Authorization SigV4 ; exporté pour les tests (vecteur officiel AWS). */
export function signV4({ method, url, headers, payloadHash, date, region, service = "s3", accessKeyId, secretAccessKey }: SignInput) {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const shortDate = amzDate.slice(0, 8);
  const all: Record<string, string> = { ...headers, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
  const names = Object.keys(all)
    .map((k) => k.toLowerCase())
    .sort();
  const canonicalHeaders = names.map((n) => `${n}:${String(all[Object.keys(all).find((k) => k.toLowerCase() === n)!]).trim().replace(/\s+/g, " ")}\n`).join("");
  const signedHeaders = names.join(";");
  const canonicalQuery = Array.from(url.searchParams.entries())
    .map(([k, v]) => [uriEncode(k), uriEncode(v)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const canonicalPath = url.pathname.split("/").map((seg) => uriEncode(decodeURIComponent(seg))).join("/") || "/";
  const canonicalRequest = [method.toUpperCase(), canonicalPath, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${shortDate}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${secretAccessKey}`, shortDate);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    amzDate,
    signature,
    canonicalRequest,
    stringToSign,
  };
}

export class S3StorageProvider implements StorageProvider {
  readonly name = "s3";
  constructor(private readonly cfg: S3Config) {}

  private objectUrl(key: string): URL {
    const encodedKey = key.split("/").map((s) => uriEncode(s)).join("/");
    if (this.cfg.pathStyle) return new URL(`${this.cfg.endpoint}/${this.cfg.bucket}/${encodedKey}`);
    const u = new URL(this.cfg.endpoint);
    return new URL(`${u.protocol}//${this.cfg.bucket}.${u.host}/${encodedKey}`);
  }

  private async send(method: "PUT" | "GET" | "DELETE", key: string, body?: Buffer, contentType?: string): Promise<Response> {
    const url = this.objectUrl(key);
    const payloadHash = sha256(body ?? "");
    const headers: Record<string, string> = { host: url.host };
    if (contentType) headers["content-type"] = contentType;
    if (body) headers["content-length"] = String(body.length);
    const signed = signV4({ method, url, headers, payloadHash, date: new Date(), region: this.cfg.region, accessKeyId: this.cfg.accessKeyId, secretAccessKey: this.cfg.secretAccessKey });
    const { host: _host, ...sendHeaders } = headers;
    void _host;
    const res = await fetch(url, {
      method,
      headers: { ...sendHeaders, "x-amz-content-sha256": payloadHash, "x-amz-date": signed.amzDate, authorization: signed.authorization },
      body: body ? new Uint8Array(body) : undefined,
    });
    if (!res.ok && !(method === "DELETE" && res.status === 404)) {
      const text = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`Stockage S3 : ${method} ${key} → ${res.status} ${text}`);
    }
    return res;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    await this.send("PUT", key, data, contentType);
    return { key, size: data.length, sha256: sha256(data) };
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.send("GET", key);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    await this.send("DELETE", key);
  }
}
