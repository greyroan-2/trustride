"use server";
import { sanitizeImageUpload } from "@/lib/image-upload";
import { emojiFormError } from "@/lib/text-input";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import { z } from "zod";
import { catalogueTags } from "@/lib/catalogue-cache";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
export async function uploadPhoto(form: FormData) {
  const actor = await requireAdmin();
  const emojiError = emojiFormError(form);
  if (emojiError) redirect(`/admin/vehicles?message=${encodeURIComponent(emojiError)}`);
  const vehicleId = z.uuid().parse(form.get("id"));
  await db.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  const file = form.get("photo");
  let message = "Photo uploaded.";
  try {
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      file.size === 0
    )
      throw new Error("Invalid image");
    const { bytes, contentType, extension: ext } = await sanitizeImageUpload(file);
    const client = await supabase();
    const path = `${vehicleId}/${randomUUID()}.${ext}`;
    const { error } = await client.storage
      .from("vehicle-assets")
      .upload(path, bytes, {
        contentType,
        upsert: false,
      });
    if (error) throw error;
    const { data } = client.storage.from("vehicle-assets").getPublicUrl(path);
    await db.$transaction(async (tx) => {
      const m = await tx.vehicleMedia.create({
        data: {
          vehicleId,
          url: data.publicUrl,
          type: "IMAGE",
          alt: z.string().min(1).max(200).parse(form.get("alt")),
        },
      });
      await tx.adminAuditLog.create({
        data: { actorId: actor.id, action: "upload-photo", targetId: m.id },
      });
    });
  } catch {
    message =
      "Photo upload failed. Use a JPEG or PNG under 5 MB and check Storage policies.";
  }
  updateTag(catalogueTags.fleet);
  revalidatePath("/admin/vehicles");
  revalidatePath("/fleet", "layout");
  revalidatePath("/");
  redirect(`/admin/vehicles?message=${encodeURIComponent(message)}&noticeId=${crypto.randomUUID()}`);
}

export async function deleteVehiclePhoto(form: FormData) {
  const actor = await requireAdmin();
  const emojiError = emojiFormError(form);
  if (emojiError) redirect(`/admin/vehicles?message=${encodeURIComponent(emojiError)}`);
  let message = "Photo deleted.";
  try {
    const id = z.uuid().parse(form.get("mediaId"));
    const vehicleId = z.uuid().parse(form.get("vehicleId"));
    if (form.get("confirmDelete") !== "yes") throw new Error("Confirm deletion first.");
    const photo = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${vehicleId}::uuid FOR UPDATE`;
      const current = await tx.vehicleMedia.findFirstOrThrow({ where: { id, vehicleId, type: "IMAGE" } });
      await tx.vehicleMedia.delete({ where: { id } });
      await tx.adminAuditLog.create({ data: { actorId: actor.id, action: "delete-vehicle-photo", targetId: id } });
      return current;
    });
    // Gallery removal must not roll back when Storage permissions or connectivity fail.
    // Relative reference images are shared local files: remove only their media entry.
    try {
      const url = new URL(photo.url, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
      const prefix = base ? `${base.pathname.replace(/\/$/, "")}/storage/v1/object/public/vehicle-assets/` : "";
      if (base && url.origin === base.origin && url.pathname.startsWith(prefix)) {
        const path = decodeURIComponent(url.pathname.slice(prefix.length));
        if (!path.startsWith(`${vehicleId}/`) || path.split("/").some(part => part === ".." || part === ".")) throw new Error("Invalid photo path.");
        const { data, error } = await (await supabase()).storage.from("vehicle-assets").remove([path]);
        if (error || !data?.some(file => file.name === path)) throw new Error("Storage cleanup not confirmed.");
      }
    } catch {
      message = "Photo removed from the gallery. Storage file cleanup could not be confirmed; check the vehicle-assets admin read/delete policies.";
      await db.adminAuditLog.create({ data: { actorId: actor.id, action: "vehicle-photo-cleanup-pending", targetId: photo.url } }).catch(() => {});
    }
  } catch {
    message = "Photo could not be deleted. Refresh and try again. For uploaded photos, check the vehicle-assets admin read/delete Storage policies.";
  }
  updateTag(catalogueTags.fleet);
  revalidatePath("/admin/vehicles");
  revalidatePath("/fleet", "layout");
  revalidatePath("/");
  redirect(`/admin/vehicles?message=${encodeURIComponent(message)}&noticeId=${crypto.randomUUID()}`);
}
