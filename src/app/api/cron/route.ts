import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { safeEqual } from "@/lib/crypto";
import { env } from "@/lib/env";
import { errorCode, logger } from "@/lib/logger";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatch";
import { applyRetention } from "@/lib/retention";
import { getSettings } from "@/lib/settings";

/**
 * Tâche planifiée (ex. toutes les 15 minutes) : renvoi des notifications en échec et
 * application de la politique de conservation. Protégée par `Authorization: Bearer <CRON_SECRET>`.
 */
async function run() {
  const secret = env().CRON_SECRET;
  const auth = (await headers()).get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const notifications = await dispatchPendingNotifications({ limit: 100 });
    const retention = await applyRetention(await getSettings());
    logger.info("cron_done", { count: notifications.sent });
    return NextResponse.json({ notifications, retention });
  } catch (err) {
    logger.error("cron_failed", { code: errorCode(err) });
    return NextResponse.json({ code: "CRON_FAILED" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
