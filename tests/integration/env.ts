/** Configuration de la base et des secrets de test (jamais utilisés en production). */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://prospectener:prospectener_dev@127.0.0.1:5432/prospectener_test?schema=public";

export function applyTestEnv(): void {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    APP_URL: "http://localhost:3100",
    APP_SECRET: "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
    APP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    CRON_SECRET: "test-cron-secret-0123456789abcdef",
    SCRYPT_COST_LOG2: "14",
    SMTP_HOST: "smtp.test.invalid",
    SMTP_FROM: "notifications@test.invalid",
    NOTIFY_WEBHOOK_SECRET: "test-webhook-secret-0123456789",
    PASSWORD_BREACH_CHECK: "off",
  });
}
