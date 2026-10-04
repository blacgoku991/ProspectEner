/**
 * Corps du webhook selon sa destination : les messageries (Discord, Slack, Telegram) n'attendent
 * qu'un texte ; les autres outils reçoivent l'événement complet (signé), avec le même texte.
 * Le texte ne contient jamais de donnée personnelle : référence, échéance et lien seulement.
 */
export function webhookBody(url: string, event: Record<string, unknown>, text: string): Record<string, unknown> {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname;
  } catch {
    return { ...event, text };
  }
  if ((host === "discord.com" || host === "discordapp.com" || host.endsWith(".discord.com")) && path.startsWith("/api/webhooks/")) {
    return { content: text };
  }
  if (host === "hooks.slack.com") return { text };
  // Telegram : https://api.telegram.org/bot<jeton>/sendMessage?chat_id=<identifiant>
  if (host === "api.telegram.org") return { text };
  return { ...event, text };
}
