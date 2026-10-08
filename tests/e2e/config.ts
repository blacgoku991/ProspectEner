/** Paramètres de l'environnement de test de bout en bout (valeurs factices, jamais utilisées en production). */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
/** Choix sur les cookies préenregistré pour les parcours (généré par la configuration globale). */
export const CONSENT_STATE_PATH = "tests/e2e/.state/consent.json";
export const E2E_ENV = {
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ?? "postgresql://prospectener:prospectener_dev@127.0.0.1:5432/prospectener_e2e?schema=public",
  APP_URL: E2E_BASE_URL,
  APP_SECRET: "e2e-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
  APP_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
  CRON_SECRET: "e2e-cron-secret-0123456789abcdef",
  ALLOW_DEMO_DATA: "false",
  TRUSTED_PROXY_HOPS: "0",
  PASSWORD_BREACH_CHECK: "off",
};

export const ADMIN = { email: "admin@e2e.invalid", password: "Correct-Horse-Battery-42", totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" };
export const COLLAB = { email: "collab@e2e.invalid", password: "Another-Strong-Passphrase-7", totpSecret: "KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU" };

/** Entreprise partenaire créée par le jeu de données (critères du modèle « pompe à chaleur air/eau »). */
export const E2E_PARTNER = { name: "Chauffage Test E2E", details: "Lyon, RGE", displayName: "Chauffage Test E2E, Lyon, RGE" };
