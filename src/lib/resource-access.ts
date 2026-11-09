// Pass only the server-verified profile; never client-provided role claims.
export function bookingOwnerFilter(user: { id: string; role: string }) {
  return user.role === "ADMIN" ? {} : { customerId: user.id };
}
