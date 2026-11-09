import "server-only";
import sharp from "sharp";

// Keep colored glyphs dark: luminance conversion can wash out bright green text.
// The minimum RGB channel preserves both the blue label and the green status.
export async function prepareLtmsHeaderVariants(image: Buffer, width: number, height: number): Promise<Buffer[]> {
  const crop = (tight: boolean) => ({ left: tight ? Math.floor(width * 0.035) : 0, top: tight ? Math.floor(height * 0.02) : 0, width: Math.max(1, Math.floor(width * (tight ? 0.65 : 0.75))), height: Math.max(1, Math.floor(height * (tight ? 0.10 : 0.20))) });
  async function colorInk(tight: boolean) {
    const { data, info } = await sharp(image).extract(crop(tight)).resize({ width: 1800 }).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
    const ink = Buffer.alloc(info.width * info.height);
    for (let pixel = 0; pixel < ink.length; pixel++) {
      const offset = pixel * info.channels;
      ink[pixel] = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    }
    return sharp(ink, { raw: { width: info.width, height: info.height, channels: 1 } }).threshold(180).extend({ top: 24, bottom: 24, left: 24, right: 24, background: "#fff" }).png().toBuffer();
  }
  return [await colorInk(true), await sharp(image).extract(crop(true)).resize({ width: 1800 }).greyscale().normalize().sharpen().extend({ top: 24, bottom: 24, left: 24, right: 24, background: "#fff" }).png().toBuffer(), await colorInk(false)];
}
