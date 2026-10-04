import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { env } from "../env";

/** Alphabet Crockford (sans I, L, O, U) : lisible et sans ambiguïté au téléphone. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateReference(): string {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `PE-${pick()}-${pick()}`;
}

/**
 * Jeton d'annulation dérivé de la clé d'idempotence (secrète, générée par le navigateur) :
 * un renvoi de la même demande restitue le même lien, sans stocker le jeton en clair.
 */
export function cancelTokenFor(idempotencyKey: string): string {
  return createHmac("sha256", env().APP_SECRET).update(`cancel\u0000${idempotencyKey}`).digest("base64url");
}
