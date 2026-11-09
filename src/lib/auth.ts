import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { enforceRateLimit } from "./rate-limit";
import { redirect } from "next/navigation";
import { activeSessionUser } from "./auth-session";
import { syncDueDeliveries } from "./delivery-sync";
import { db } from "./db";
export { safeNext } from "./auth-redirect";
// React cache deduplicates only within one server render. Permissions are
// rechecked on the next request, so revoked access is never shared or cached.
export const currentUserProfile = cache(async () => {
  const user = await activeSessionUser();
  if (!user) return null;
  const existing = await db.userProfile.findUnique({ where: { id: user.id } });
  if (existing) return existing;
  return db.userProfile.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email!, name: String(user.user_metadata?.name ?? "").slice(0, 100) },
    update: {},
  });
});
export async function requireUser(next = "/dashboard") {
  const user = await currentUserProfile();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  await syncDueDeliveries();
  if ((await headers()).has("next-action")) await enforceRateLimit("account-mutations", user.id, 40);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}


export async function requireClient(next = "/bookings") {
  const user = await requireUser(next);
  if (user.role !== "CLIENT") redirect("/admin");
  return user;
}
