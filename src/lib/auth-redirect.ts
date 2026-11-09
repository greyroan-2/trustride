export function safeNext(value: unknown) {
  return typeof value === "string" &&
    /^\/(fleet|dashboard|bookings|profile|notifications|admin|reset-password)(\/|$|\?)/.test(value) &&
    !value.includes("\\")
    ? value
    : "/fleet";
}
export function authCallbackTarget(next: unknown, recovery: boolean) {
  return recovery ? "/reset-password" : safeNext(next);
}

export const isGuestOnlyAuthPage = (slug: string) => ["login", "register", "forgot-password"].includes(slug);
