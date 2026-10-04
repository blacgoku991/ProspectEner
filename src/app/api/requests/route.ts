import { after, NextResponse } from "next/server";
import { headers } from "next/headers";
import { readLimitedText } from "@/lib/http";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatch";
import { errorCode, logger } from "@/lib/logger";
import { clientIpFromHeaders, isSameOrigin, userAgentFromHeaders } from "@/lib/request-context";
import { createContactRequest } from "@/lib/requests/create";

const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: Request) {
  const h = await headers();
  if (!isSameOrigin(h)) {
    return NextResponse.json({ code: "FORBIDDEN_ORIGIN", message: "Origine non autorisée." }, { status: 403 });
  }
  const text = await readLimitedText(request, MAX_BODY_BYTES);
  if (text === null) {
    return NextResponse.json({ code: "PAYLOAD_TOO_LARGE", message: "Demande trop volumineuse." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ code: "INVALID_JSON", message: "Requête invalide." }, { status: 400 });
  }

  try {
    const result = await createContactRequest(body, { ip: clientIpFromHeaders(h), userAgent: userAgentFromHeaders(h) });
    if (!result.ok) {
      return NextResponse.json({ code: result.code, message: result.message, fieldErrors: result.fieldErrors }, { status: result.status });
    }
    if (!result.replay) {
      // Envoi des notifications après la réponse : un échec n'affecte jamais l'enregistrement.
      after(async () => {
        try {
          await dispatchPendingNotifications({ requestId: result.requestId });
        } catch (err) {
          logger.warn("notification_dispatch_error", { code: errorCode(err) });
        }
      });
    }
    return NextResponse.json(
      {
        reference: result.reference,
        cancelToken: result.cancelToken,
        channel: result.channel,
        callbackDeadline: result.callbackDeadline,
        requestSentence: result.requestSentence,
        replay: result.replay,
      },
      { status: result.status },
    );
  } catch (err) {
    logger.error("request_route_error", { code: errorCode(err) });
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Une erreur technique est survenue. Votre demande n'a pas été enregistrée : merci de réessayer." },
      { status: 500 },
    );
  }
}
