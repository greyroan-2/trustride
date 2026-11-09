import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
const schemaVersion = "delivered-lifecycle-v4";
const globalDb = globalThis as unknown as { db?: PrismaClient; dbSchemaVersion?: string };
if (globalDb.db && globalDb.dbSchemaVersion !== schemaVersion) {
  void globalDb.db.$disconnect();
  globalDb.db = undefined;
}
export const db =
  globalDb.db ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, statement_timeout: 15000 }),
  });
if (process.env.NODE_ENV !== "production") {
  globalDb.db = db;
  globalDb.dbSchemaVersion = schemaVersion;
}
