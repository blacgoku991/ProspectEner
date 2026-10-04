import { after, NextResponse } from "next/server";
import { headers } from "next/headers";
import { readLimitedText } from "@/lib/http";
import { errorCode, logger } from "@/lib/logger";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatch";
import { clientIpFromHeaders, isSameOrigin } from "@/lib/request-context";
import { cancelContactRequest } from "@/lib/requests/cancel";

export async function POST(request: Request) {
  const h = await headers();
  if (!isSameOrigin(h)) return NextResponse.json({ code: "FORBIDDEN_ORIGIN", message: "Origine non autorisée." }, { status: 403 });
  let body: unknown;
  try {
    const text = await readLimitedText(request, 4096);
    if (text === null) throw new Error("too large");
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ code: "INVALID_JSON", message: "Requête invalide." }, { status: 400 });
  }
  try {
    const result = await cancelContactRequest(body, { ip: clientIpFromHeaders(h) });
    if (!result.ok) return NextResponse.json({ code: result.code, message: result.message }, { status: result.status });
    if (!result.alreadyCancelled) {
      after(async () => {
        try {
          await dispatchPendingNotifications({ requestId: result.requestId });
        } catch (err) {
          logger.warn("notification_dispatch_error", { code: errorCode(err) });
        }
      });
    }
    return NextResponse.json({ reference: result.reference, alreadyCancelled: result.alreadyCancelled });
  } catch (err) {
    logger.error("cancel_route_error", { code: errorCode(err) });
    return NextResponse.json({ code: "SERVER_ERROR", message: "Une erreur technique est survenue. Merci de réessayer." }, { status: 500 });
  }
}
