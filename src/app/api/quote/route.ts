import { readSmallJson } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reservation, calculatePrice } from "@/lib/validation";
export async function POST(request: Request) {
  await requireUser("/fleet");
  try {
    const input = reservation.parse(await readSmallJson(request));
    const vehicle = await db.vehicle.findFirst({
      where: { id: input.vehicleId, archived: false, status: "ACTIVE" },
      include: { pricing: true },
    });
    if (!vehicle?.pricing)
      return NextResponse.json(
        { error: "Pricing unavailable" },
        { status: 404 },
      );
    const p = vehicle.pricing;
    return NextResponse.json({
      ...calculatePrice(
        input.start,
        input.end,
        p.dailyMinor,
        p.feeMinor,
        p.depositMinor,
      ),
      currency: p.currency,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid quote request" },
      { status: 400 },
    );
  }
}
