import "server-only";
import { randomBytes, scrypt as scryptCb, type ScryptOptions, timingSafeEqual } from "node:crypto";

/**
 * Hachage des mots de passe avec scrypt (paramètres recommandés par l'OWASP :
 * N = 2^17, r = 8, p = 1). Format : scrypt$<log2N>$<r>$<p>$<sel>$<empreinte>.
 */

const DEFAULT_LOG2N = 17;
const R = 8;
const P = 1;
const KEYLEN = 64;

function costLog2(): number {
  const fromEnv = Number(process.env.SCRYPT_COST_LOG2);
  // Coût réduit autorisé uniquement pour les tests automatisés, jamais sous 2^14.
  if (process.env.NODE_ENV === "test" && Number.isInteger(fromEnv) && fromEnv >= 14) return fromEnv;
  return DEFAULT_LOG2N;
}

function scrypt(password: string, salt: Buffer, log2n: number, r: number, p: number): Promise<Buffer> {
  const options: ScryptOptions = { N: 2 ** log2n, r, p, maxmem: 256 * 1024 * 1024 };
  return new Promise((resolve, reject) => {
    scryptCb(password.normalize("NFKC"), salt, KEYLEN, options, (err, derived) => (err ? reject(err) : resolve(derived)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const log2n = costLog2();
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, log2n, R, P);
  return ["scrypt", log2n, R, P, salt.toString("base64url"), derived.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) {
    // Temps de calcul comparable même sans compte, pour ne pas révéler l'existence d'un e-mail.
    await scrypt(password, randomBytes(16), costLog2(), R, P);
    return false;
  }
  const [algo, log2n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !log2n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const derived = await scrypt(password, Buffer.from(salt, "base64url"), Number(log2n), Number(r), Number(p));
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Politique de mot de passe : longueur avant tout (recommandations CNIL / ANSSI). */
export function passwordPolicyError(password: string, email?: string): string | null {
  if (password.length < 12) return "Le mot de passe doit contenir au moins 12 caractères.";
  if (password.length > 200) return "Le mot de passe est trop long.";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (password.length < 16 && classes < 3) {
    return "Utilisez au moins 3 types de caractères (minuscules, majuscules, chiffres, symboles) ou une phrase de passe de 16 caractères ou plus.";
  }
  if (email && password.toLowerCase().includes(email.split("@")[0]!.toLowerCase())) {
    return "Le mot de passe ne doit pas contenir votre identifiant.";
  }
  if (/^(.)\1+$/.test(password)) return "Le mot de passe est trop simple.";
  return null;
}
