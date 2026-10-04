"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin, requireStaff } from "@/lib/auth/guards";
import { hashEmail, hashPhone } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { requestContext } from "@/lib/request-context";
import { maskEmail, maskPhone, normalizeFrenchPhone } from "@/lib/validation/contact";

export interface OppState {
  error?: string;
  ok?: string;
}

/** Ajout manuel (opposition reçue par courrier, e-mail ou téléphone). Seule une empreinte est conservée. */
export async function addOppositionAction(_prev: OppState, formData: FormData): Promise<OppState> {
  const ctx = await requireStaff();
  const value = String(formData.get("value") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  let data: { phoneHash?: string; emailHash?: string; maskedValue: string };
  const phone = normalizeFrenchPhone(value);
  if (phone) data = { phoneHash: hashPhone(phone), maskedValue: maskPhone(phone) };
  else if (z.email().safeParse(value.toLowerCase()).success) data = { emailHash: hashEmail(value), maskedValue: maskEmail(value.toLowerCase()) };
  else return { error: "Saisissez un numéro de téléphone français ou une adresse e-mail valide." };
  const exists = await prisma.opposition.findFirst({ where: data.phoneHash ? { phoneHash: data.phoneHash } : { emailHash: data.emailHash } });
  if (exists) return { ok: "Ce contact figure déjà dans la liste d'opposition." };
  const created = await prisma.opposition.create({
    data: {
      ...data,
      source: "STAFF",
      note: note || null,
      createdById: ctx.user.id,
      expiresAt: new Date(Date.now() + ctx.settings.retention.oppositionMonths * 30.44 * 24 * 3600 * 1000),
    },
  });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "OPPOSITION_ADDED", targetType: "Opposition", targetId: created.id, ip });
  revalidatePath("/admin/oppositions");
  return { ok: "Opposition enregistrée (empreinte non réversible)." };
}

export async function removeOppositionAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  await prisma.opposition.delete({ where: { id } });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "OPPOSITION_REMOVED", targetType: "Opposition", targetId: id, ip });
  revalidatePath("/admin/oppositions");
}
