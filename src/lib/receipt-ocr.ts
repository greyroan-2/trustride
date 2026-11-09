import "server-only";
import { createHash } from "node:crypto";
import path from "node:path";
import englishData from "@tesseract.js-data/eng";
import sharp from "sharp";
import { createWorker, PSM } from "tesseract.js";
import { parseReceiptText, ReceiptReadError, type ReceiptDetails } from "./receipt-parser";

const languagePath = path.join(englishData.langPath, "..", "4.0.0_best_int");
const cache = new Map<string, { expires: number; result: ReceiptDetails }>();
let queue: Promise<void> = Promise.resolve();
let waiting = 0;

export async function extractReceipt(bytes: Uint8Array): Promise<ReceiptDetails> {
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if ((!jpg && !png) || bytes.length > 5 * 1024 * 1024) throw new ReceiptReadError("Upload a JPEG or PNG receipt of 5 MB or smaller.");
  const key = createHash("sha256").update(bytes).digest("hex");
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.result;
  if (waiting >= 3) throw new ReceiptReadError("Receipt scanning is busy. Please try again shortly.");
  waiting++;
  const previous = queue;
  let release!: () => void;
  queue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    const image = await sharp(bytes, { limitInputPixels: 20_000_000 }).rotate().resize({ width: 1500, withoutEnlargement: true }).flatten({ background: "#ffffff" }).greyscale().normalize().sharpen().png().toBuffer();
    const worker = await createWorker("eng", 1, { langPath: languagePath, gzip: true, cacheMethod: "none" });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
      const result = await Promise.race([
        worker.recognize(image),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new ReceiptReadError("Receipt scanning timed out. Try a clearer image.")), 45000); }),
      ]);
      if (result.data.confidence < 55) throw new ReceiptReadError("The receipt image is too unclear. Please upload a sharper image.");
      const details = parseReceiptText(result.data.text);
      if (cache.size >= 20) cache.delete(cache.keys().next().value!);
      cache.set(key, { result: details, expires: Date.now() + 10 * 60 * 1000 });
      return details;
    } finally {
      clearTimeout(timeout);
      await worker.terminate();
    }
  } finally { waiting--; release(); }
}
