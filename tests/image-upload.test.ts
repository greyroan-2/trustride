import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { sanitizeImageUpload, MAX_IMAGE_BYTES } from "../src/lib/image-upload";
const image = () => sharp({ create: { width: 8, height: 8, channels: 3, background: "#ffffff" } }).png().toBuffer();
test("image uploads fully decode and strip appended data", async () => {
  const bytes = await image();
  const marker = Buffer.from("NOT_IMAGE_DATA_TEST_MARKER");
  const result = await sanitizeImageUpload(new File([Buffer.concat([bytes, marker])], "id.png", { type: "image/png" }));
  assert.equal(result.bytes.includes(marker), false);
  assert.equal((await sharp(result.bytes).metadata()).width, 8);
});
test("nonimages, mismatched MIME and extensions, and truncated files are rejected", async () => {
  const bytes = await image();
  for (const file of [new File(["plain text"],"photo.png",{type:"image/png"}),new File(["plain text"],"bill.pdf",{type:"application/pdf"}),new File(["plain text"],"photo.svg",{type:"image/svg+xml"}),new File([bytes],"photo.png",{type:"application/octet-stream"}),new File([bytes],"photo.jpg",{type:"image/jpeg"}),new File([bytes.subarray(0,16)],"truncated.png",{type:"image/png"})]) await assert.rejects(sanitizeImageUpload(file));
});
test("oversized and empty uploads are rejected before reading their bodies", async () => {
  for(const size of [0,MAX_IMAGE_BYTES+1]) await assert.rejects(sanitizeImageUpload({size,name:"id.png",type:"image/png",arrayBuffer:async()=>{throw new Error("must not read");}}),/5 MB/);
});

test("JPEG uploads remain valid and embedded metadata is discarded", async () => {
 const original=await sharp({create:{width:12,height:10,channels:3,background:"white"}}).withMetadata().jpeg().toBuffer();
 const result=await sanitizeImageUpload(new File([original],"photo.jpeg",{type:"image/jpeg"}));
 const metadata=await sharp(result.bytes).metadata();
 assert.equal(result.contentType,"image/jpeg");assert.equal(metadata.format,"jpeg");assert.equal(metadata.exif,undefined);
 await assert.rejects(sanitizeImageUpload(new File([original],"photo.exe.jpeg",{type:"image/jpeg"})));
});
