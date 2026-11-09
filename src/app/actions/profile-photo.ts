"use server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { sanitizeImageUpload, ImageUploadError } from "@/lib/image-upload";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { isOwnedProfilePhoto, profilePhotoUrl } from "@/lib/profile-photo";
import { catalogueTags } from "@/lib/catalogue-cache";

type Result = { error?: string; success?: string; avatarUrl?: string | null };
export async function saveProfilePhoto(_previous: Result, form: FormData): Promise<Result> {
  const user = await requireUser("/profile");
  const client = await supabase();
  let uploaded: string | undefined;
  let previous: string | null = null;
  try {
    await enforceRateLimit("profile-photos", user.id, 6);
    const remove = form.get("operation") === "remove";
    if (!remove) {
      const file = form.get("photo");
      if (!(file instanceof File)) return { error: "Choose a JPEG or PNG profile photo." };
      const image = await sanitizeImageUpload(file);
      const bytes = await sharp(image.bytes).resize(256,256,{fit:"cover",position:"attention"}).flatten({background:"#ffffff"}).jpeg({quality:88}).toBuffer();
      const path = `${user.id}/${randomUUID()}.jpg`;
      const { error } = await client.storage.from("profile-photos").upload(path,bytes,{contentType:"image/jpeg",upsert:false,cacheControl:"3600"});
      if (error) return { error: "Could not upload the photo. Please try again." };
      uploaded = path;
    }
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "UserProfile" WHERE id=${user.id}::uuid FOR UPDATE`;
      previous = (await tx.userProfile.findUniqueOrThrow({where:{id:user.id},select:{avatarPath:true}})).avatarPath;
      await tx.userProfile.update({where:{id:user.id},data:{avatarPath:uploaded ?? null}});
    });
  } catch(error) {
    if (uploaded) await client.storage.from("profile-photos").remove([uploaded]).catch(()=>{});
    return { error: error instanceof ImageUploadError || error instanceof RateLimitError ? error.message : "Could not save your profile photo. Please try again." };
  }
  if (previous && isOwnedProfilePhoto(previous,user.id)) await client.storage.from("profile-photos").remove([previous]).catch(()=>{});
  updateTag(catalogueTags.testimonials);
  revalidatePath("/","layout");
  return {success:uploaded ? "Profile photo saved." : "Profile photo removed.",avatarUrl:profilePhotoUrl(uploaded)};
}
