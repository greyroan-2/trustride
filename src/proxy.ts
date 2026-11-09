import { contentSecurityPolicy } from "@/lib/content-security-policy";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { isSameOriginMutation, requestBodyLimit, trustedClientIp } from "@/lib/request-security";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthConnectionError } from "@/lib/auth-errors";
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (mutation && !isSameOriginMutation(request.headers, request.url, process.env.NEXT_PUBLIC_SITE_URL)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (mutation && (!Number.isFinite(length) || length < 0 || length > requestBodyLimit(request.nextUrl.pathname, request.headers.has("next-action")))) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  const ip = trustedClientIp(request.headers, process.env.TRUSTED_PROXY_IP_HEADER);
  const auth = mutation && ["/login", "/register", "/forgot-password"].includes(request.nextUrl.pathname);
  try {
    await enforceRateLimit(auth ? "authentication" : mutation ? "writes" : "reads", ip, auth ? 8 : mutation ? 40 : 240, auth ? 300 : 60);
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error;
    return NextResponse.json({ error: error.message }, { status: error.unavailable ? 503 : 429, headers: { "Retry-After": String(error.retryAfter), "Cache-Control": "no-store" } });
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "production");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const next = () => {
    const result = NextResponse.next({ request: { headers: requestHeaders } });
    result.headers.set("Content-Security-Policy", csp);
    if (/^\/(admin|bookings|dashboard|profile|notifications|forgot-password|reset-password|auth|api)(?:\/|$)/.test(request.nextUrl.pathname)) result.headers.set("Cache-Control", "private, no-store");
    return result;
  };
  let response = next();
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return response;
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          // Include refreshed cookies in the forwarded request as well.
          requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
          response = next();
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  try {
    await client.auth.getUser();
  } catch (error) {
    // Let protected routes perform their own strict verification. An auth
    // outage must not prevent public pages from rendering or clear cookies.
    if (!isAuthConnectionError(error)) throw error;
  }
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
