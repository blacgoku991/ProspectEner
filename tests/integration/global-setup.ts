import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "./env";

/** Applique les migrations sur la base de test avant la suite d'intégration. */
export default function setup(): void {
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, stdio: "pipe" });
}
