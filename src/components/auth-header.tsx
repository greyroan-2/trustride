import { profilePhotoUrl } from "@/lib/profile-photo";
import { currentUserProfile } from "@/lib/auth";
import { Header } from "./header";
import { isAuthConnectionError } from "@/lib/auth-errors";

export async function AuthHeader() {
  let headerUser: { email?: string; name?: string; avatarUrl?: string | null; isAdmin: boolean } | null = null;
  let authUnavailable = false;
  try {
    const user = await currentUserProfile();
    headerUser = user ? { email: user.email, name: user.name, avatarUrl: profilePhotoUrl(user.avatarPath), isAdmin: user.role === "ADMIN" } : null;
  } catch (error) {
    if (!isAuthConnectionError(error)) throw error;
    authUnavailable = true;
  }
  return <Header user={headerUser} authUnavailable={authUnavailable} />;
}
