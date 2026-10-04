import "server-only";
import { createHmac } from "node:crypto";
import { createTransport } from "nodemailer";
import { env } from "../env";

export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
}

export interface WebhookMessage {
  url: string;
  body: Record<string, unknown>;
}

export interface NotificationTransport {
  sendEmail(message: EmailMessage): Promise<void>;
  postWebhook(message: WebhookMessage): Promise<void>;
}

let transporter: ReturnType<typeof createTransport> | null = null;

const defaultTransport: NotificationTransport = {
  async sendEmail(message) {
    const e = env();
    if (!e.SMTP_HOST || !e.SMTP_FROM) throw new Error("SMTP_NOT_CONFIGURED");
    transporter ??= createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT ?? 587,
      secure: e.SMTP_SECURE ?? false,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD ?? "" } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transporter.sendMail({ from: e.SMTP_FROM, to: message.to, subject: message.subject, text: message.text });
  },
  async postWebhook(message) {
    const secret = env().NOTIFY_WEBHOOK_SECRET;
    if (!secret) throw new Error("WEBHOOK_SECRET_NOT_CONFIGURED");
    const body = JSON.stringify(message.body);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    const res = await fetch(message.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-prospectener-timestamp": timestamp,
        "x-prospectener-signature": `sha256=${signature}`,
      },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`WEBHOOK_HTTP_${res.status}`);
  },
};

let override: NotificationTransport | null = null;

export function notificationTransport(): NotificationTransport {
  return override ?? defaultTransport;
}

/** Remplacement du transport (tests automatisés uniquement). */
export function setNotificationTransportForTests(t: NotificationTransport | null): void {
  if (process.env.NODE_ENV !== "test") throw new Error("Réservé aux tests");
  override = t;
}
