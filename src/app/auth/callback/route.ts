import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { authCallbackTarget } from "@/lib/auth-redirect";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const recovery = request.nextUrl.searchParams.get("type") === "recovery";
  const target = authCallbackTarget(request.nextUrl.searchParams.get("next"), recovery);
  try {
    const client = await supabase();
    const result = code ? await client.auth.exchangeCodeForSession(code) : recovery && tokenHash ? await client.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }) : null;
    if (result && !result.error) {
      // Supabase retains the verified PKCE flow type. Older recovery emails
      // targeting /profile must also open the dedicated password form.
      const verifiedRecovery = "redirectType" in result.data && result.data.redirectType === "recovery";
      return NextResponse.redirect(new URL(verifiedRecovery ? "/reset-password" : target, request.url), { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    }
  } catch { /* An invalid or expired link must not create a reset session. */ }
  const reset = target === "/reset-password";
  return NextResponse.redirect(new URL(reset ? "/forgot-password?message=This+reset+link+has+expired+or+could+not+be+verified.+Please+request+a+new+one." : "/login?message=Unable+to+verify+this+link", request.url), { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
