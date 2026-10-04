"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { requestContext } from "@/lib/request-context";

export interface AcqState {
  error?: string;
  ok?: string;
}

const code = z.string().trim().regex(/^[\w.\-+]{1,64}$/, "Valeur utm invalide (lettres, chiffres, . _ - + uniquement)");

export async function saveChannelAction(_prev: AcqState, formData: FormData): Promise<AcqState> {
  const ctx = await requireAdmin();
  const parsed = z
    .object({
      campaign: code,
      source: z.union([z.literal(""), code]),
      medium: z.union([z.literal(""), code]),
      label: z.string().trim().min(2).max(120),
      authorizationNote: z.string().trim().max(500),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  const row = await prisma.acquisitionChannel.upsert({
    where: { campaign: d.campaign },
    create: { campaign: d.campaign, source: d.source || null, medium: d.medium || null, label: d.label, authorizationNote: d.authorizationNote || null },
    update: { source: d.source || null, medium: d.medium || null, label: d.label, authorizationNote: d.authorizationNote || null, active: true },
  });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "ACQUISITION_UPDATED", targetType: "AcquisitionChannel", targetId: row.id, ip, metadata: { campaign: d.campaign } });
  revalidatePath("/admin/acquisition");
  return { ok: "Canal enregistré." };
}

export async function toggleChannelAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const row = await prisma.acquisitionChannel.findUniqueOrThrow({ where: { id } });
  await prisma.acquisitionChannel.update({ where: { id }, data: { active: !row.active } });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "ACQUISITION_UPDATED", targetType: "AcquisitionChannel", targetId: id, ip, metadata: { active: !row.active } });
  revalidatePath("/admin/acquisition");
}
