import { bookingOwnerFilter } from "@/lib/resource-access";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { workflowData, selfDriveDocuments, driverDocuments } from "@/lib/booking-workflow";
import { z } from "zod";

export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string; kind: string }> }) {
  const user = await requireUser("/bookings");
  const { bookingId, kind } = await params;
  if (!z.uuid().safeParse(bookingId).success || (kind !== "paymentProof" && ![...selfDriveDocuments, ...driverDocuments].some(document => document.key === kind))) return new Response("Not found", { status: 404 });
  const booking = await db.booking.findFirst({ where: { id: bookingId, ...bookingOwnerFilter(user) }, include: { workflow: true } });
  const details = workflowData(booking?.workflow?.data);
  const document = kind === "paymentProof" ? details.paymentProof?.document : details.documents?.[kind];
  if (!booking || !document || !document.path.startsWith(`${booking.customerId}/${bookingId}/`)) return new Response("Not found", { status: 404 });
  const { data, error } = await (await supabase()).storage.from("booking-requirements").createSignedUrl(document.path, 60);
  if (error || !data) return new Response("Document is currently unavailable", { status: 503 });
  return new Response(null, { status: 303, headers: { Location: data.signedUrl, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
