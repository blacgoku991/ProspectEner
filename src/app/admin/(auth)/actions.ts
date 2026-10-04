"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { clearFreshRecoveryCodes, storeFreshRecoveryCodes } from "@/lib/auth/enrollment";
import { getCurrentSession, mfaRequiredFor } from "@/lib/auth/guards";
import { clearFailures, isLocked, registerFailure } from "@/lib/auth/lockout";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { newPasswordError } from "@/lib/auth/password-check";
import { createSession, destroySession, revokeAllSessions, upgradeSession } from "@/lib/auth/session";
import { generateRecoveryCodes, hashRecoveryCode, verifyTotp } from "@/lib/auth/totp";
import { decrypt, hashToken, safeEqual } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { requestContext } from "@/lib/request-context";
import { getSettings } from "@/lib/settings";

export interface FormState {
  error?: string;
  ok?: boolean;
  recoveryCodes?: string[];
  /** Adresse saisie, réaffichée après un échec (le formulaire est réinitialisé après chaque envoi). */
  email?: string;
}

const GENERIC_LOGIN_ERROR = "Identifiants invalides ou compte temporairement verrouillé.";
const LOCKED_ERROR = "Trop de tentatives : le compte est temporairement verrouillé. Réessayez plus tard.";
/** Plafond quotidien d'essais de codes de second facteur par compte (en plus de la limite sur 10 minutes). */
const MFA_DAILY_LIMIT = 30;

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
  const keep = { email: email.slice(0, 160) };

  const byIp = await rateLimit("login-ip", ip ?? "unknown", 20, 900);
  const byAccount = await rateLimit("login-account", email, 10, 900);
  if (!byIp.allowed || !byAccount.allowed) {
    await audit({ action: "AUTH_LOCKED", targetType: "StaffUser", ip, metadata: { reason: "rate_limit" } });
    return { error: "Trop de tentatives. Réessayez dans quelques minutes.", ...keep };
  }

  const user = await prisma.staffUser.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  const locked = Boolean(user && isLocked(user));
  if (!user || !valid || locked || !user.isActive) {
    if (user && !locked) await registerFailure(user, ip, "password");
    await audit({ actor: user ?? null, action: "AUTH_LOGIN_FAILURE", targetType: "StaffUser", targetId: user?.id, ip });
    return { error: GENERIC_LOGIN_ERROR, ...keep };
  }

  const settings = await getSettings();
  const needsSecondFactor = Boolean(user.mfaEnabledAt) || mfaRequiredFor(user, settings);
  await createSession(user.id, { fullyAuthenticated: !needsSecondFactor, ip, userAgent });
  await audit({ actor: user, action: "AUTH_LOGIN_SUCCESS", targetType: "StaffUser", targetId: user.id, ip, metadata: { secondFactorPending: needsSecondFactor } });
  if (!needsSecondFactor) {
    await clearFailures(user.id, { lastLoginAt: new Date() });
    redirect(safeNext(formData.get("suite")));
  }
  // Second facteur en attente : le compteur d'échecs est conservé jusqu'à sa validation.
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

/** Déconnexion automatique après une période d'inactivité dans l'administration. */
export async function idleLogoutAction(): Promise<void> {
  const s = await getCurrentSession();
  const { ip } = await requestContext();
  if (s) await audit({ actor: s.user, action: "AUTH_LOGOUT", targetType: "StaffUser", targetId: s.user.id, ip, metadata: { reason: "idle" } });
  await destroySession();
  redirect("/admin/connexion?inactif=1");
}

// ─── Second facteur ─────────────────────────────────────────────────────────

/** Limites d'essais de codes : 8 par 10 minutes et MFA_DAILY_LIMIT par jour et par compte. */
async function mfaAttemptAllowed(userId: string, scope: string): Promise<boolean> {
  const short = await rateLimit(scope, userId, 8, 600);
  const daily = await rateLimit(`${scope}-day`, userId, MFA_DAILY_LIMIT, 86_400);
  return short.allowed && daily.allowed;
}

export async function verifyMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await getCurrentSession();
  if (!s) redirect("/admin/connexion");
  const { ip, userAgent } = await requestContext();
  const user = await prisma.staffUser.findUniqueOrThrow({ where: { id: s.user.id } });
  if (isLocked(user)) {
    await destroySession();
    return { error: LOCKED_ERROR };
  }
  if (!(await mfaAttemptAllowed(user.id, "mfa"))) return { error: "Trop de tentatives. Reconnectez-vous plus tard." };
  if (!user.mfaSecretEnc || !user.mfaEnabledAt) redirect("/admin/mfa/configuration");

  const code = String(formData.get("code") ?? "").trim();
  let ok = false;
  if (/^\d{6}$/.test(code.replace(/\s/g, ""))) {
    const step = verifyTotp(decrypt(user.mfaSecretEnc), code, { lastUsedStep: user.mfaLastUsedStep });
    if (step !== null) {
      ok = true;
      await prisma.staffUser.update({ where: { id: user.id }, data: { mfaLastUsedStep: BigInt(step) } });
    }
  } else if (code.length >= 8 && code.length <= 20) {
    const h = hashRecoveryCode(code);
    const match = user.recoveryCodeHashes.find((x) => safeEqual(x, h));
    if (match) {
      ok = true;
      await prisma.staffUser.update({ where: { id: user.id }, data: { recoveryCodeHashes: user.recoveryCodeHashes.filter((x) => x !== match) } });
      await audit({ actor: user, action: "AUTH_RECOVERY_CODE_USED", targetType: "StaffUser", targetId: user.id, ip });
    }
  }
  if (!ok) {
    await audit({ actor: user, action: "AUTH_MFA_FAILURE", targetType: "StaffUser", targetId: user.id, ip });
    if (await registerFailure(user, ip, "mfa")) {
      await destroySession();
      return { error: LOCKED_ERROR };
    }
    return { error: "Code invalide ou déjà utilisé." };
  }
  await clearFailures(user.id, { lastLoginAt: new Date() });
  await upgradeSession(s.session, { ip, userAgent });
  await audit({ actor: user, action: "AUTH_MFA_SUCCESS", targetType: "StaffUser", targetId: user.id, ip });
  redirect(safeNext(formData.get("suite")));
}

export async function confirmEnrollmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await getCurrentSession();
  if (!s) redirect("/admin/connexion");
  const { ip, userAgent } = await requestContext();
  const user = await prisma.staffUser.findUniqueOrThrow({ where: { id: s.user.id } });
  if (user.mfaEnabledAt) redirect("/admin");
  if (isLocked(user)) {
    await destroySession();
    return { error: LOCKED_ERROR };
  }
  if (!(await mfaAttemptAllowed(user.id, "mfa-enroll"))) return { error: "Trop de tentatives. Réessayez plus tard." };
  if (!user.mfaSecretEnc) return { error: "Rechargez la page pour générer un nouveau secret." };
  const step = verifyTotp(decrypt(user.mfaSecretEnc), String(formData.get("code") ?? ""));
  if (step === null) {
    if (await registerFailure(user, ip, "mfa")) {
      await destroySession();
      return { error: LOCKED_ERROR };
    }
    return { error: "Code incorrect. Vérifiez l'heure de votre téléphone et réessayez." };
  }
  const codes = generateRecoveryCodes();
  await prisma.staffUser.update({
    where: { id: user.id },
    data: { mfaEnabledAt: new Date(), mfaLastUsedStep: BigInt(step), recoveryCodeHashes: codes.map(hashRecoveryCode) },
  });
  await clearFailures(user.id, { lastLoginAt: new Date() });
  await upgradeSession(s.session, { ip, userAgent });
  await audit({ actor: user, action: "AUTH_MFA_ENROLLED", targetType: "StaffUser", targetId: user.id, ip });
  await storeFreshRecoveryCodes(codes);
  redirect("/admin/mfa/codes");
}

export async function dismissRecoveryCodesAction(): Promise<void> {
  await clearFreshRecoveryCodes();
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
  const problem = await newPasswordError(password, user.email);
  if (problem) return { error: problem };
  await prisma.staffUser.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date(), setupTokenHash: null, setupTokenExpiresAt: null, failedLoginCount: 0, lockedUntil: null },
  });
  // Un nouveau mot de passe ferme toute session encore ouverte sur ce compte.
  await revokeAllSessions(user.id);
  await audit({ actor: user, action: "AUTH_PASSWORD_CHANGED", targetType: "StaffUser", targetId: user.id, ip, metadata: { via: "activation" } });
  const settings = await getSettings();
  const needsMfa = mfaRequiredFor(user, settings) || Boolean(user.mfaEnabledAt);
  await createSession(user.id, { fullyAuthenticated: !needsMfa, ip, userAgent });
  redirect(needsMfa ? (user.mfaEnabledAt ? "/admin/mfa" : "/admin/mfa/configuration") : "/admin");
}
