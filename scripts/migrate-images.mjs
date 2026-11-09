import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || /[•]/.test(key) || !process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, and a full server-only SUPABASE_SECRET_KEY in .env.');
  process.exit(1);
}
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 }) });
const images = [
  { file: 'veloz.webp', slug: 'toyota-veloz', name: 'Toyota Veloz' },
  { file: 'innova.webp', slug: 'toyota-innova', name: 'Toyota Innova' },
  { file: 'story.jpg' },
  { file: 'trust ride logo.jpg' },
];
try {
  await db.$queryRaw`SELECT 1`;
  for (const image of images) {
    const bytes = await readFile(new URL(`../public/images/${image.file}`, import.meta.url));
    const contentType = image.file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const path = `imported/${hash}-${image.file.replaceAll(' ', '-')}`;
    const { error } = await client.storage.from('vehicle-assets').upload(path, bytes, { contentType, upsert: false });
    if (error && String(error.statusCode) !== '409') throw new Error(`Upload failed for ${image.file} (status ${error.statusCode ?? 'unknown'}).`);
    const { data } = client.storage.from('vehicle-assets').getPublicUrl(path);
    const response = await fetch(data.publicUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok || createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex') !== createHash('sha256').update(bytes).digest('hex')) {
      throw new Error(`Public download verification failed for ${image.file}.`);
    }
    if (image.slug) await db.$transaction(async tx => {
      const model = await tx.vehicleModel.upsert({ where: { slug: image.slug }, update: {}, create: { slug: image.slug, name: image.name, description: 'Demonstration fleet entry. Specifications, rental rates, and actual vehicle assets require business verification.', features: [] } });
      const vehicle = await tx.vehicle.upsert({ where: { unitCode: `DEMO-${image.slug}` }, update: {}, create: { modelId: model.id, unitCode: `DEMO-${image.slug}` } });
      const exists = await tx.vehicleMedia.findFirst({ where: { vehicleId: vehicle.id, url: data.publicUrl } });
      if (!exists) await tx.vehicleMedia.create({ data: { vehicleId: vehicle.id, url: data.publicUrl, type: 'IMAGE', alt: `${image.name} model reference illustration; not an actual rental unit photo` } });
    });
    console.log(JSON.stringify({ file: image.file, url: data.publicUrl, verified: true }));
  }
} catch (error) {
  console.error('Image migration failed:', error instanceof Error && /^(Upload failed|Public download)/.test(error.message) ? error.message : 'Check the database connection and server-only Storage credentials.');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
