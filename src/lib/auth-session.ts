import "server-only";
import { supabase, configured } from "./supabase";
import { db } from "./db";
import { z } from "zod";
import { cache } from "react";

// JWTs can outlive global logout. Require the verified token's session to exist.
export const activeSessionUser = cache(async function activeSessionUser() {
  if (!configured()) return null;
  const client = await supabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error && (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500)) throw error;
  if (!user) return null;
  const { data, error: claimsError } = await client.auth.getClaims();
  if (claimsError) throw claimsError;
  const sessionId = z.uuid().safeParse(data?.claims.session_id);
  if (!sessionId.success || data?.claims.sub !== user.id) return null;
  const [session] = await db.$queryRaw<{ active: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM auth.sessions
      WHERE id = ${sessionId.data}::uuid AND user_id = ${user.id}::uuid
    ) AS active
  `;
  return session?.active ? user : null;
});
