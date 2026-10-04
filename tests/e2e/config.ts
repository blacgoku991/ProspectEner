/** Paramètres de l'environnement de test de bout en bout (valeurs factices, jamais utilisées en production). */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_ENV = {
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ?? "postgresql://prospectener:prospectener_dev@127.0.0.1:5432/prospectener_e2e?schema=public",
  APP_URL: E2E_BASE_URL,
  APP_SECRET: "e2e-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
  APP_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
  CRON_SECRET: "e2e-cron-secret-0123456789abcdef",
  ALLOW_DEMO_DATA: "false",
  TRUSTED_PROXY_HOPS: "0",
};

export const ADMIN = { email: "admin@e2e.invalid", password: "Correct-Horse-Battery-42", totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" };
export const COLLAB = { email: "collab@e2e.invalid", password: "Another-Strong-Passphrase-7", totpSecret: "KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU" };
