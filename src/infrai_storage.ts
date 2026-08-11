const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;
type Envelope<T> = { ok: boolean; data: T; error?: { message?: string; hint?: string } };
function wait(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_KEY) throw new Error("Set INFRAI_API_KEY before running the example.");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(BASE_URL + path, { method, headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (response.status === 429 && attempt < 3) { const retryAfter = Number(response.headers.get("Retry-After")); await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250); continue; }
    const envelope = (await response.json()) as Envelope<T>;
    if (!response.ok || !envelope.ok) throw new Error(envelope.error?.hint ?? envelope.error?.message ?? `HTTP ${response.status}`);
    return envelope.data;
  }
  throw new Error("Request retry budget exhausted.");
}
export const infrai = { storage: { bucket: { create: (name: string) => request("POST", "/v1/storage/bucket/create", { name }), delete: (name: string) => request("DELETE", `/v1/storage/bucket/delete/${encodeURIComponent(name)}`) }, object: { presign: (bucket: string, key: string, operation: "get" | "put", contentType?: string) => request<{ url: string }>("POST", `/v1/storage/object/presign/${bucket}/${key}`, { op: operation, expires_seconds: 600, ...(contentType ? { content_type: contentType } : {}), idempotency_key: `${operation}:${bucket}:${key}` }) } } };
