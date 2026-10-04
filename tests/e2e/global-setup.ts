import { execSync } from "node:child_process";
import { E2E_ENV } from "./config";

export default function globalSetup(): void {
  const env = { ...process.env, ...E2E_ENV, NODE_ENV: "test", SCRYPT_COST_LOG2: "14" } as NodeJS.ProcessEnv;
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx --conditions=react-server tests/e2e/seed-e2e.ts", { env, stdio: "inherit" });
}
