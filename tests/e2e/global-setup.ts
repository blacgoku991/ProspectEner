import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CONSENT_STATE_PATH, E2E_BASE_URL, E2E_ENV } from "./config";

export default function globalSetup(): void {
  const env = { ...process.env, ...E2E_ENV, NODE_ENV: "test", SCRYPT_COST_LOG2: "14" } as NodeJS.ProcessEnv;
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx --conditions=react-server tests/e2e/seed-e2e.ts", { env, stdio: "inherit" });
  // Choix sur les cookies déjà fait (refus) : le bandeau ne gêne pas les parcours testés ailleurs.
  mkdirSync(dirname(CONSENT_STATE_PATH), { recursive: true });
  writeFileSync(
    CONSENT_STATE_PATH,
    JSON.stringify({
      cookies: [
        {
          name: "pe-consent",
          value: `1.0.${Date.now()}`,
          domain: new URL(E2E_BASE_URL).hostname,
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 180 * 24 * 3600,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
}
