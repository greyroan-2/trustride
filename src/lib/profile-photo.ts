const avatarPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png)$/i;
export function isOwnedProfilePhoto(path: string, userId: string) { return avatarPattern.test(path) && path.startsWith(`${userId}/`); }
export function profilePhotoUrl(path?: string | null, base = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (!path || !avatarPattern.test(path) || !base) return null;
  try { const url = new URL(base); if (!["https:", "http:"].includes(url.protocol)) return null; return `${url.origin}/storage/v1/object/public/profile-photos/${path}`; } catch { return null; }
}
