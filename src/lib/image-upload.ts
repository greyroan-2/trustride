import sharp from "sharp";
export class ImageUploadError extends Error {}
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;

// Decode and re-encode: headers alone do not establish that a file is an image.
// The new file contains pixels only; metadata and appended payloads are discarded.
export async function sanitizeImageUpload(file: Pick<File, "size" | "name" | "type" | "arrayBuffer">) {
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new ImageUploadError("Upload a JPEG or PNG image of 5 MB or smaller.");
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (!extension || !["jpg", "jpeg", "png"].includes(extension) || /\.(?:exe|com|bat|cmd|ps1|sh|php\d*|phtml|js|html?|svg|scr|msi|jar)(?:\.|$)/i.test(file.name)) throw new ImageUploadError("Only JPEG and PNG image files are accepted.");
  const expected = extension === "png" ? "png" : "jpeg";
  if (file.type !== `image/${expected}`) throw new ImageUploadError("The image type does not match its filename.");
  const original = Buffer.from(await file.arrayBuffer());
  if (original.length !== file.size || original.length > MAX_IMAGE_BYTES) throw new ImageUploadError("Invalid image size.");
  const jpeg = original[0] === 255 && original[1] === 216 && original[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => original[index] === byte);
  if (expected === "jpeg" ? !jpeg : !png) throw new ImageUploadError("The uploaded file is not a valid JPEG or PNG image.");
  try {
    const image = sharp(original, { limitInputPixels: MAX_PIXELS, failOn: "warning", animated: false });
    const metadata = await image.metadata();
    if (metadata.format !== expected || !metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image");
    const output = image.rotate();
    const bytes = expected === "png" ? await output.png({ compressionLevel: 9 }).toBuffer() : await output.jpeg({ quality: 92 }).toBuffer();
    if (bytes.length > MAX_IMAGE_BYTES) throw new ImageUploadError("The processed image is too large. Upload a smaller image.");
    return { bytes, contentType: `image/${expected}`, extension: expected === "png" ? "png" : "jpg" };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError("This image is damaged, too large, animated, or not a supported image. Upload a clear JPEG or PNG.");
  }
}
