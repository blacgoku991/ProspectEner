import { headers } from "next/headers";

/**
 * Données structurées schema.org (JSON-LD) pour les moteurs de recherche.
 * Le contenu est échappé (« < ») et porte le nonce de la CSP par précaution.
 */
export async function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
