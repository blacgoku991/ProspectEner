import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { decrypt, encrypt } from "../crypto";
import { prisma } from "../db";
import { isProduction } from "../env";
import { getSettings } from "../settings";
import { getCurrentSession } from "./guards";
import { generateTotpSecret, otpauthUri } from "./totp";

/**
 * Fonctions serveur des pages d'enrôlement MFA. Elles ne sont volontairement pas dans un fichier
 * « use server » : seules les actions de formulaire doivent être appelables depuis le navigateur.
 */

const RECOVERY_COOKIE = "pe_recovery_codes";

/** Prépare l'enrôlement : secret généré côté serveur, stocké chiffré, non actif tant qu'il n'est pas confirmé. */
export async function prepareEnrollment(): Promise<{ secret: string; qrDataUrl: string; uri: string }> {
  const s = await getCurrentSession();
  if (!s) redirect("/admin/connexion");
  if (s.user.mfaEnabledAt) redirect("/admin");
  let secret: string;
  if (s.user.mfaSecretEnc) secret = decrypt(s.user.mfaSecretEnc);
  else {
    secret = generateTotpSecret();
    await prisma.staffUser.update({ where: { id: s.user.id }, data: { mfaSecretEnc: encrypt(secret) } });
  }
  const settings = await getSettings();
  const uri = otpauthUri(secret, s.user.email, settings.company.name || "ProspectEner");
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: "#0c1b18", light: "#ffffff" } });
  return { secret, qrDataUrl, uri };
}

/** Codes de récupération affichés une seule fois : transmis via un cookie chiffré, éphémère et limité à /admin/mfa. */
export async function storeFreshRecoveryCodes(codes: string[]): Promise<void> {
  (await cookies()).set(RECOVERY_COOKIE, encrypt(JSON.stringify(codes)), {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/admin/mfa",
    maxAge: 300,
  });
}

/** Lit (sans les effacer) les codes de récupération fraîchement générés. */
export async function readFreshRecoveryCodes(): Promise<string[] | null> {
  const raw = (await cookies()).get(RECOVERY_COOKIE)?.value;
  if (!raw) return null;
  try {
    const codes = JSON.parse(decrypt(raw)) as unknown;
    return Array.isArray(codes) && codes.every((c) => typeof c === "string") ? (codes as string[]) : null;
  } catch {
    return null;
  }
}

export async function clearFreshRecoveryCodes(): Promise<void> {
  (await cookies()).set(RECOVERY_COOKIE, "", { path: "/admin/mfa", maxAge: 0 });
}
