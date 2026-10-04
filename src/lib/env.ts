import "server-only";
import { z } from "zod";

/**
 * Variables d'environnement validées au démarrage. Aucun secret n'est exposé au navigateur :
 * ce module est réservé au serveur (`server-only`).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  APP_URL: z.url().default("http://localhost:3000"),
  /** Secret HMAC (empreintes d'IP, de contacts, de jetons) — 32 octets aléatoires minimum. */
  APP_SECRET: z.string().min(32, "APP_SECRET doit contenir au moins 32 caractères"),
  /** Clé AES-256-GCM (base64, 32 octets) pour chiffrer les secrets MFA. */
  APP_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "APP_ENCRYPTION_KEY doit être une clé base64 de 32 octets"),
  CRON_SECRET: z.string().min(24).optional(),
  /** Données de démonstration autorisées (jamais en production). */
  ALLOW_DEMO_DATA: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  // E-mail (notifications internes)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Webhook (notifications internes)
  NOTIFY_WEBHOOK_SECRET: z.string().min(16).optional(),
  // Protection anti-robots optionnelle (Cloudflare Turnstile)
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  /** Nombre de proxys de confiance devant l'application (pour lire l'IP client). */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  /**
   * Refus des mots de passe présents dans des fuites connues (service Have I Been Pwned, k-anonymat :
   * seuls les 5 premiers caractères de l'empreinte SHA-1 sont transmis). « off » pour un environnement sans accès externe.
   */
  PASSWORD_BREACH_CHECK: z.enum(["on", "off"]).default("on"),
});

export type Env = z.infer<typeof schema>;

/**
 * Valeurs fournies par l'hébergeur quand elles ne sont pas définies explicitement :
 * URL publique de production (Vercel) et base ajoutée depuis la Marketplace Vercel.
 */
export function withPlatformDefaults(raw: Record<string, string | undefined>): Record<string, string | undefined> {
  const out = { ...raw };
  if (!out.APP_URL && out.VERCEL_PROJECT_PRODUCTION_URL) out.APP_URL = `https://${out.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (!out.DATABASE_URL && out.POSTGRES_URL) out.DATABASE_URL = out.POSTGRES_URL;
  return out;
}

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(withPlatformDefaults(process.env));
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuration invalide : ${details}`);
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.ALLOW_DEMO_DATA) {
    throw new Error("ALLOW_DEMO_DATA ne peut pas être activé en production.");
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";
