import "server-only";
import { createHash } from "node:crypto";
import { env } from "../env";
import { logger } from "../logger";
import { passwordPolicyError } from "./password";

const RANGE_API = "https://api.pwnedpasswords.com/range/";

/**
 * Le mot de passe figure-t-il dans une fuite de données connue ? Interrogation par k-anonymat :
 * seuls les 5 premiers caractères de son empreinte SHA-1 quittent le serveur (jamais le mot de passe).
 * Renvoie null si la vérification n'a pas pu être faite (service injoignable, désactivé) : on ne bloque pas.
 */
export async function isPasswordBreached(
  password: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number; enabled?: boolean } = {},
): Promise<boolean | null> {
  if (!(options.enabled ?? env().PASSWORD_BREACH_CHECK === "on")) return null;
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await (options.fetchImpl ?? fetch)(`${RANGE_API}${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(options.timeoutMs ?? 3000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [hashSuffix, count] = line.trim().split(":");
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch {
    logger.warn("password_breach_check_unavailable");
    return null;
  }
}

/** Contrôle complet d'un nouveau mot de passe : politique locale, puis fuites connues. */
export async function newPasswordError(password: string, email?: string): Promise<string | null> {
  const policy = passwordPolicyError(password, email);
  if (policy) return policy;
  if (await isPasswordBreached(password)) {
    return "Ce mot de passe apparaît dans des fuites de données publiques : il serait parmi les premiers essayés par un attaquant. Choisissez-en un autre.";
  }
  return null;
}
