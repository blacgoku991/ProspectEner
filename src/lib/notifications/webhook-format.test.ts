import { describe, expect, it } from "vitest";
import { webhookBody } from "./webhook-format";

const EVENT = { event: "request.created", reference: "PE-ABCD-1234", url: "https://exemple.fr/admin/demandes/1" };
const TEXT = "Nouvelle demande PE-ABCD-1234 : https://exemple.fr/admin/demandes/1";

describe("format du webhook selon la destination", () => {
  it("Discord : un message texte seulement", () => {
    expect(webhookBody("https://discord.com/api/webhooks/123/abc", EVENT, TEXT)).toEqual({ content: TEXT });
    expect(webhookBody("https://discordapp.com/api/webhooks/123/abc", EVENT, TEXT)).toEqual({ content: TEXT });
  });

  it("Slack et Telegram : un champ texte", () => {
    expect(webhookBody("https://hooks.slack.com/services/T/B/X", EVENT, TEXT)).toEqual({ text: TEXT });
    expect(webhookBody("https://api.telegram.org/bot123:abc/sendMessage?chat_id=42", EVENT, TEXT)).toEqual({ text: TEXT });
  });

  it("autres outils : l'événement complet, avec le texte", () => {
    expect(webhookBody("https://hooks.exemple.fr/prospectener", EVENT, TEXT)).toEqual({ ...EVENT, text: TEXT });
  });

  it("une adresse qui imite Discord reçoit l'événement complet", () => {
    expect(webhookBody("https://discord.com.exemple.fr/api/webhooks/1/a", EVENT, TEXT)).toEqual({ ...EVENT, text: TEXT });
  });
});
