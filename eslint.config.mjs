import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([...next, ...ts, { files: ["scripts/ci-database.cjs", "scripts/security-check.cjs", "scripts/smoke-test.cjs", "scripts/verify-delivery.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } }, globalIgnores([".next/**"])]);
