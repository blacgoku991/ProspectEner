"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { getCurrentSession, mfaRequiredFor } from "@/lib/auth/guards";
import { hashPassword, passwordPolicyError, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, upgradeSession } from "@/lib/auth/session";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp,
} from "@/lib/auth/totp";
import { decrypt, encrypt, hashToken, safeEqual } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { isProduction } from "@/lib/env";
import { rateLimit } from "@/lib/ratelimit";
import { requestContext } from "@/lib/request-context";
import { getSettings } from "@/lib/settings";

export interface FormState {
  error?: string;
  ok?: boolean;
  recoveryCodes?: string[];
}

const GENERIC_LOGIN_ERROR = "Identifiants invalides ou compte temporairement verrouillé.";
const MAX_FAILURES = 10;
const LOCK_MINUTES = 15;

function safeNext(raw: FormDataEntryValue | null): string {
  const v = typeof raw === "string" ? raw : "";
  return /^\/admin(\/[\w\-/]*)?$/.test(v) && !v.startsWith("/admin/connexion") ? v : "/admin";
}

// ─── Connexion ──────────────────────────────────────────────────────────────

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { ip, userAgent } = await requestContext();
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().max(160), password: z.string().min(1).max(200) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: GENERIC_LOGIN_ERROR };
  const { email, password } = parsed.data;

  const byIp = await rateLimit("login-ip", ip ?? "unknown", 20, 900);
  const byAccount = await rateLimit("login-account", email, 10, 900);
  if (!byIp.allowed || !byAccount.allowed) {
    await audit({ action: "AUTH_LOCKED", targetType: "StaffUser", ip, metadata: { reason: "rate_limit" } });
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const user = await prisma.staffUser.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  const locked = Boolean(user?.lockedUntil && user.lockedUntil.getTime() > Date.now());
  if (!user || !valid || locked || !user.isActive) {
    if (user && !locked) {
      const failures = user.failedLoginCount + 1;
      await prisma.staffUser.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failures >= MAX_FAILURES ? 0 : failures,
          lockedUntil: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
        },
      });
      if (failures >= MAX_FAILURES) await audit({ actor: user, action: "AUTH_LOCKED", targetType: "StaffUser", targetId: user.id, ip });
    }
    await audit({ actor: user ?? null, action: "AUTH_LOGIN_FAILURE", targetType: "StaffUser", targetId: user?.id, ip });
    return { error: GENERIC_LOGIN_ERROR };
  }

  await prisma.staffUser.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  const settings = await getSettings();
  const needsSecondFactor = Boolean(user.mfaEnabledAt) || mfaRequiredFor(user, settings);
  await createSession(user.id, { fullyAuthenticated: !needsSecondFactor, ip, userAgent });
  await audit({ actor: user, action: "AUTH_LOGIN_SUCCESS", targetType: "StaffUser", targetId: user.id, ip, metadata: { secondFactorPending: needsSecondFactor } });
  if (!needsSecondFactor) {
    await prisma.staffUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    redirect(safeNext(formData.get("suite")));
  }
  const next = encodeURIComponent(safeNext(formData.get("suite")));
  redirect(user.mfaEnabledAt ? `/admin/mfa?suite=${next}` : "/admin/mfa/configuration");
}

export async function logoutAction(): Promise<void> {
  const s = await getCurrentSession();
  const { ip } = await requestContext();
  if (s) await audit({ actor: s.user, action: "AUTH_LOGOUT", targetType: "StaffUser", targetId: s.user.id, ip });
  await destroySession();
  redirect("/admin/connexion");
}

// ─── Second facteur ─────────────────────────────────────────────────────────

export async function verifyMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await getCurrentSession();
  if (!s) redirect("/admin/connexion");
  const { ip, userAgent } = await requestContext();
  const rl = await rateLimit("mfa", s.user.id, 8, 600);
  if (!rl.allowed) return { error: "Trop de tentatives. Reconnectez-vous dans quelques minutes." };
  const user = await prisma.staffUser.findUniqueOrThrow({ where: { id: s.user.id } });
  if (!user.mfaSecretEnc || !user.mfaEnabledAt) redirect("/admin/mfa/configuration");

  const code = String(formData.get("code") ?? "").trim();
  let ok = false;
  if (/^\d{6}$/.test(code.replace(/\s/g, ""))) {
    const step = verifyTotp(decrypt(user.mfaSecretEnc), code, { lastUsedStep: user.mfaLastUsedStep });
    if (step !== null) {
      ok = true;
      await prisma.staffUser.update({ where: { id: user.id }, data: { mfaLastUsedStep: BigInt(step), lastLoginAt: new Date() } });
    }
  } else if (code.length >= 8) {
    const h = hashRecoveryCode(code);
    const match = user.recoveryCodeHashes.find((x) => safeEqual(x, h));
    if (match) {
      ok = true;
      await prisma.staffUser.update({
        where: { id: user.id },
        data: { recoveryCodeHashes: user.recoveryCodeHashes.filter((x) => x !== match), lastLoginAt: new Date() },
      });
      await audit({ actor: user, action: "AUTH_RECOVERY_CODE_USED", targetType: "StaffUser", targetId: user.id, ip });
    }
  }
  if (!ok) {
    await audit({ actor: user, action: "AUTH_MFA_FAILURE", targetType: "StaffUser", targetId: user.id, ip });
    return { error: "Code invalide ou déjà utilisé." };
  }
  await upgradeSession(s.session, { ip, userAgent });
  await audit({ actor: user, action: "AUTH_MFA_SUCCESS", targetType: "StaffUser", targetId: user.id, ip });
  redirect(safeNext(formData.get("suite")));
}

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

export async function confirmEnrollmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await getCurrentSession();
  if (!s) redirect("/admin/connexion");
  const { ip, userAgent } = await requestContext();
  const rl = await rateLimit("mfa-enroll", s.user.id, 8, 600);
  if (!rl.allowed) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  const user = await prisma.staffUser.findUniqueOrThrow({ where: { id: s.user.id } });
  if (user.mfaEnabledAt) redirect("/admin");
  if (!user.mfaSecretEnc) return { error: "Rechargez la page pour générer un nouveau secret." };
  const step = verifyTotp(decrypt(user.mfaSecretEnc), String(formData.get("code") ?? ""));
  if (step === null) return { error: "Code incorrect. Vérifiez l'heure de votre téléphone et réessayez." };
  const codes = generateRecoveryCodes();
  await prisma.staffUser.update({
    where: { id: user.id },
    data: { mfaEnabledAt: new Date(), mfaLastUsedStep: BigInt(step), recoveryCodeHashes: codes.map(hashRecoveryCode), lastLoginAt: new Date() },
  });
  await upgradeSession(s.session, { ip, userAgent });
  await audit({ actor: user, action: "AUTH_MFA_ENROLLED", targetType: "StaffUser", targetId: user.id, ip });
  // Codes affichés une seule fois sur une page dédiée : transmis via un cookie chiffré, éphémère et limité à /admin/mfa.
  (await cookies()).set(RECOVERY_COOKIE, encrypt(JSON.stringify(codes)), {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/admin/mfa",
    maxAge: 300,
  });
  redirect("/admin/mfa/codes");
}

const RECOVERY_COOKIE = "pe_recovery_codes";

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

export async function dismissRecoveryCodesAction(): Promise<void> {
  (await cookies()).set(RECOVERY_COOKIE, "", { path: "/admin/mfa", maxAge: 0 });
  redirect("/admin");
}

// ─── Activation d'un compte (lien à usage unique) ───────────────────────────

export async function activateAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { ip, userAgent } = await requestContext();
  const rl = await rateLimit("activation", ip ?? "unknown", 10, 900);
  if (!rl.allowed) return { error: "Trop de tentatives. Réessayez plus tard." };
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!/^[\w-]{20,100}$/.test(token)) return { error: "Lien d'activation invalide." };
  const user = await prisma.staffUser.findUnique({ where: { setupTokenHash: hashToken(token) } });
  if (!user || !user.setupTokenExpiresAt || user.setupTokenExpiresAt.getTime() < Date.now() || !user.isActive) {
    return { error: "Ce lien d'activation est invalide ou a expiré. Demandez-en un nouveau à un administrateur." };
  }
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };
  const policy = passwordPolicyError(password, user.email);
  if (policy) return { error: policy };
  await prisma.staffUser.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date(), setupTokenHash: null, setupTokenExpiresAt: null, failedLoginCount: 0, lockedUntil: null },
  });
  await audit({ actor: user, action: "AUTH_PASSWORD_CHANGED", targetType: "StaffUser", targetId: user.id, ip, metadata: { via: "activation" } });
  const settings = await getSettings();
  const needsMfa = mfaRequiredFor(user, settings) || Boolean(user.mfaEnabledAt);
  await createSession(user.id, { fullyAuthenticated: !needsMfa, ip, userAgent });
  redirect(needsMfa ? (user.mfaEnabledAt ? "/admin/mfa" : "/admin/mfa/configuration") : "/admin");
}
