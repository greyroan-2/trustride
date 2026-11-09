export function isAuthConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; message?: string; status?: number; code?: string; cause?: unknown };
  return value.name === "AuthRetryableFetchError" ||
    (typeof value.status === "number" && value.status >= 500 && value.status < 600) ||
    (value.name === "TypeError" && value.message === "fetch failed") ||
    ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EACCES", "UND_ERR_CONNECT_TIMEOUT", "P1001", "P1002", "P1017"].includes(value.code ?? "") ||
    (value.cause !== error && isAuthConnectionError(value.cause));
}
