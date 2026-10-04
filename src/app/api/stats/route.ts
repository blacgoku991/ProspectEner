import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { parisToday } from "@/lib/business-days";
import { FUNNEL_STEPS } from "@/lib/funnel";
import { readLimitedText } from "@/lib/http";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { clientIpFromHeaders, isSameOrigin } from "@/lib/request-context";

/**
 * Mesure de parcours agrégée : seul le nom de l'étape atteinte est reçu et compté par jour.
 * Aucun cookie, aucun identifiant, aucune réponse au questionnaire.
 */

export async function POST(request: Request) {
  const h = await headers();
  if (!isSameOrigin(h)) return new NextResponse(null, { status: 204 });
  let step: unknown;
  try {
    const text = await readLimitedText(request, 256);
    if (text === null) return new NextResponse(null, { status: 204 });
    step = (JSON.parse(text) as { step?: unknown }).step;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (typeof step !== "string" || !(FUNNEL_STEPS as readonly string[]).includes(step)) return new NextResponse(null, { status: 204 });
  const rl = await rateLimit("stats", clientIpFromHeaders(h) ?? "unknown", 120, 3600);
  if (!rl.allowed) return new NextResponse(null, { status: 204 });
  const day = new Date(`${parisToday()}T00:00:00Z`);
  await prisma.$executeRaw`
    INSERT INTO "FunnelDailyStat" ("day", "step", "count") VALUES (${day}::date, ${step}, 1)
    ON CONFLICT ("day", "step") DO UPDATE SET "count" = "FunnelDailyStat"."count" + 1`;
  return new NextResponse(null, { status: 204 });
}
