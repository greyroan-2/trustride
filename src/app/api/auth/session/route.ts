import { activeSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  try {
    return Response.json({ active: Boolean(await activeSessionUser()) }, { headers });
  } catch {
    // An unavailable auth/database service must not trigger a global sign-out.
    return Response.json({ error: "Session verification unavailable" }, { status: 503, headers });
  }
}
