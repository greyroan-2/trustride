import { createHash } from "node:crypto";
type Usage = { count: number; expires: number };
export class RateLimitError extends Error {
  constructor(public readonly retryAfter: number, public readonly unavailable = false) { super(unavailable ? "Request protection is temporarily unavailable. Please try again shortly." : "Too many requests. Please wait before trying again."); }
}
// Bounded local fallback for development/single-instance deployments. Distributed
// enforcement must be enabled for production replicas (see SECURITY.md).
export class MemoryRateLimiter {
  private entries = new Map<string, Usage>();
  constructor(private readonly maxEntries = 10000) {}
  consume(key: string, limit: number, windowMs: number, now = Date.now()) {
    for (const [id, item] of this.entries) if (item.expires <= now) this.entries.delete(id);
    let usage = this.entries.get(key);
    if (!usage) {
      if (this.entries.size >= this.maxEntries) throw new RateLimitError(Math.ceil(windowMs / 1000));
      usage = { count: 0, expires: now + windowMs }; this.entries.set(key, usage);
    }
    usage.count += 1;
    if (usage.count > limit) throw new RateLimitError(Math.max(1, Math.ceil((usage.expires - now) / 1000)));
  }
}
const local = new MemoryRateLimiter();
const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}";
export async function enforceRateLimit(scope: string, identity: string, limit: number, windowSeconds = 60) {
  const key = `trustride:limit:${scope}:${createHash("sha256").update(identity).digest("hex")}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      if (new URL(url).protocol !== "https:") throw new Error("HTTPS required");
      const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(["EVAL", script, "1", key, String(windowSeconds * 1000)]), cache: "no-store", signal: AbortSignal.timeout(2000) });
      const data = await response.json() as { result?: [number, number]; error?: string };
      if (!response.ok || data.error || !Array.isArray(data.result) || !Number.isFinite(data.result[0]) || !Number.isFinite(data.result[1])) throw new Error("Invalid limiter response");
      if (data.result[0] > limit) throw new RateLimitError(Math.max(1, Math.ceil(data.result[1] / 1000)));
      return;
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      // Once a distributed backend is configured, do not silently bypass it.
      throw new RateLimitError(10, true);
    }
  }
  if (process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === "true") throw new RateLimitError(10, true);
  local.consume(key, limit, windowSeconds * 1000);
}
