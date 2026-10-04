import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { DEFAULT_SETTINGS, parseSettings, type SiteSettings, siteSettingsSchema } from "./settings-schema";

export async function getSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return row ? parseSettings(row.data) : DEFAULT_SETTINGS;
}

export async function saveSettings(next: SiteSettings, updatedById: string | null): Promise<SiteSettings> {
  const data = siteSettingsSchema.parse(next);
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, data: data as unknown as Prisma.InputJsonValue, updatedById },
    update: { data: data as unknown as Prisma.InputJsonValue, updatedById },
  });
  return data;
}

/** Disponibilité des transports de notification (secrets présents côté serveur). */
export function notificationTransports(): { email: boolean; webhook: boolean } {
  const e = env();
  return {
    email: Boolean(e.SMTP_HOST && e.SMTP_FROM),
    webhook: Boolean(e.NOTIFY_WEBHOOK_SECRET),
  };
}
