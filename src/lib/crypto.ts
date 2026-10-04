import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** Jeton aléatoire encodé en base64url (par défaut 256 bits). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * HMAC-SHA256 avec séparation de domaine : la même valeur donne des empreintes différentes
 * selon l'usage (IP, téléphone, e-mail, jeton…). Non réversible sans le secret serveur.
 */
export function hmacHex(purpose: string, value: string): string {
  return createHmac("sha256", env().APP_SECRET).update(`${purpose}\u0000${value}`, "utf8").digest("hex");
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return hmacHex("ip", ip).slice(0, 32);
}

export function hashPhone(e164: string): string {
  return hmacHex("contact:phone", e164);
}

export function hashEmail(email: string): string {
  return hmacHex("contact:email", email.trim().toLowerCase());
}

/** Empreinte d'un jeton secret (lien d'annulation, session, activation). */
export function hashToken(token: string): string {
  return hmacHex("token", token);
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// ─── Chiffrement symétrique (AES-256-GCM) ───────────────────────────────────

function key(): Buffer {
  return Buffer.from(env().APP_ENCRYPTION_KEY, "base64");
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Format chiffré inconnu");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
