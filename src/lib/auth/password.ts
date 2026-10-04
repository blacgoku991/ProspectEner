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

/**
 * Mots de base les plus fréquents des mots de passe divulgués (listes publiques, adaptées au français) :
 * « Motdepasse2026! » ou « Azertyuiop1? » respectent les règles de longueur mais se devinent en quelques essais.
 */
const COMMON_BASES = new Set([
  "password", "motdepasse", "azerty", "azertyuiop", "qwerty", "qwertyuiop", "qwertz", "admin", "administrateur", "administrator",
  "root", "bonjour", "bonsoir", "soleil", "welcome", "bienvenue", "letmein", "iloveyou", "jetaime", "changeme", "secret", "motdepassesecret",
  "football", "dragon", "monkey", "sunshine", "princess", "marseille", "paris", "france", "abc", "abcdef", "abcdefgh", "abcdefghijkl",
  "test", "testtest", "utilisateur", "user", "login", "connexion", "prospectener", "renovation", "simulateur", "maprimerenov",
]);

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

/** Partie « mot » d'un mot de passe : minuscules, sans accents, chiffres « leet » convertis, sans séparateurs. */
export function passwordCore(password: string): string {
  const lower = password.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Chiffres et symboles ajoutés au début ou à la fin (« 2026! ») : ils ne font pas partie du mot.
  const trimmed = lower.replace(/^[^a-z]+|[^a-z]+$/g, "");
  return [...trimmed]
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "");
}

/** Politique de mot de passe : longueur avant tout (recommandations CNIL / ANSSI), sans mot de passe courant. */
export function passwordPolicyError(password: string, email?: string): string | null {
  if (password.length < 12) return "Le mot de passe doit contenir au moins 12 caractères.";
  if (password.length > 200) return "Le mot de passe est trop long.";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (password.length < 16 && classes < 3) {
    return "Utilisez au moins 3 types de caractères (minuscules, majuscules, chiffres, symboles) ou une phrase de passe de 16 caractères ou plus.";
  }
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && password.toLowerCase().includes(local)) {
    return "Le mot de passe ne doit pas contenir votre identifiant.";
  }
  if (new Set(password).size <= 3 || (/^\d+$/.test(password) && password.length < 20)) return "Le mot de passe est trop simple.";
  if (COMMON_BASES.has(passwordCore(password))) {
    return "Ce mot de passe est trop courant : choisissez une phrase de passe personnelle (plusieurs mots sans lien entre eux, par exemple).";
  }
  return null;
}
