import { isIP } from "node:net";
export function trustedClientIp(headers: Headers, trustedHeader?: string) {
  // Only use a header overwritten by a trusted reverse proxy. Never accept an
  // arbitrary X-Forwarded-For supplied directly by a visitor.
  const value = trustedHeader ? headers.get(trustedHeader)?.split(",")[0]?.trim() : undefined;
  return value && isIP(value) ? value : "unidentified";
}
export function isSameOriginMutation(headers: Headers, requestUrl: string, configuredOrigin?: string) {
  if (headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(configuredOrigin || requestUrl).origin; } catch { return false; }
}
export function requestBodyLimit(pathname: string, serverAction: boolean) {
  // Requirements can include four 5 MB images plus multipart overhead.
  return serverAction && !["/login", "/register", "/forgot-password"].includes(pathname) ? 22 * 1024 * 1024 : 16 * 1024;
}

export async function readSmallJson(request: Request, maxBytes = 16 * 1024) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("JSON content type required.");
  if (!request.body) throw new Error("Request body required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("Request body too large."); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } finally { reader.releaseLock(); }
}
