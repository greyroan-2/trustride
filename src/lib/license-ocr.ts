import "server-only";
import path from "node:path";
import englishData from "@tesseract.js-data/eng";
import sharp from "sharp";
import { prepareLtmsHeaderVariants } from "./ltms-header";
import { createWorker, PSM } from "tesseract.js";
import { LicenseReadError, assertLtmsActiveText, parseLicenseText, matchLicenseIdentities, type LicenseIdentity } from "./license-parser";

let queue: Promise<void> = Promise.resolve();
let waiting = 0;
const languagePath = path.join(englishData.langPath, "..", "4.0.0_best_int");
async function scanImages(images: { bytes: Uint8Array; digital: boolean }[]): Promise<LicenseIdentity[]> {
  for (const { bytes } of images) {
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    if ((!jpeg && !png) || !bytes.length || bytes.length > 5 * 1024 * 1024) throw new LicenseReadError("The driver's license and LTMS uploads must be JPEG or PNG images of 5 MB or smaller. PDF is not supported for these two checks.");
  }
  if (waiting >= 3) throw new LicenseReadError("Document scanning is busy. Please try again shortly.");
  waiting++;
  const previous = queue;
  let release!: () => void;
  queue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    const worker = await createWorker("eng", 1, { langPath: languagePath, gzip: true, cacheMethod: "none" });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      async function read(bytes: Uint8Array, digital: boolean): Promise<LicenseIdentity> {
        const oriented = await sharp(bytes, { limitInputPixels: 20_000_000 }).rotate().flatten({ background: "#fff" }).png().toBuffer({ resolveWithObject: true });
        if (digital) {
          // Prefer the small status strip; fall back to the larger upper-left region.
          const headers = await prepareLtmsHeaderVariants(oriented.data, oriented.info.width, oriented.info.height);
          let active = false;
          for (const header of headers) {
            for (const mode of [PSM.SINGLE_BLOCK, PSM.SPARSE_TEXT]) {
              await worker.setParameters({ tessedit_pageseg_mode: mode, preserve_interword_spaces: "1" });
              const result = await worker.recognize(header);
              try { assertLtmsActiveText(result.data.text); active = true; break; }
              catch (error) { if (!(error instanceof LicenseReadError)) throw error; }
            }
            if (active) break;
          }
          if (!active) assertLtmsActiveText("");
        }
        const image = await sharp(oriented.data).resize({ width: 2000 }).greyscale().normalize().sharpen().png().toBuffer();
        let lastError: unknown;
        for (const mode of [PSM.AUTO, PSM.SPARSE_TEXT]) {
          await worker.setParameters({ tessedit_pageseg_mode: mode, preserve_interword_spaces: "1" });
          const result = await worker.recognize(image);
          try {
            if (result.data.confidence < 50) throw new LicenseReadError("The document is too unclear to read. Upload a sharper, complete image.");
            return parseLicenseText(result.data.text);
          } catch (error) { lastError = error; }
        }
        throw lastError;
      }
      return await Promise.race([
        (async () => { const identities: LicenseIdentity[] = []; for (const image of images) identities.push(await read(image.bytes, image.digital)); return identities; })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new LicenseReadError("Document scanning timed out. Upload clearer images and try again.")), 90000); }),
      ]);
    } finally { clearTimeout(timer); await worker.terminate(); }
  } catch (error) {
    if (error instanceof LicenseReadError) throw error;
    throw new LicenseReadError("Could not read the license images. Upload clear JPEG or PNG images and try again.");
  } finally { waiting--; release(); }
}

export async function extractLicenseImage(bytes: Uint8Array, digital: boolean): Promise<LicenseIdentity> {
  return (await scanImages([{ bytes, digital }]))[0];
}
export async function checkLicenseImages(license: Uint8Array, ltms: Uint8Array): Promise<LicenseIdentity> {
  const [physical, digital] = await scanImages([{ bytes: license, digital: false }, { bytes: ltms, digital: true }]);
  return matchLicenseIdentities(physical, digital);
}
