import type { Metadata } from "next";
import { cookies } from "next/headers";
import { pageMetadata } from "@/lib/seo";
import { ClearLocalData } from "@/components/site/ClearLocalData";
import { ConsentPreferences } from "@/components/site/ConsentPreferences";
import { LegalPage } from "@/components/site/LegalPage";
import { CONSENT_COOKIE } from "@/lib/consent";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "Cookies et préférences", description: "Aucun cookie publicitaire ni outil de mesure d'audience tiers : ce que ce site enregistre dans votre navigateur, et votre choix.", path: "/cookies" });
}

export default async function CookiesPage() {
  const consentRaw = (await cookies()).get(CONSENT_COOKIE)?.value ?? null;
  return (
    <LegalPage title="Cookies et préférences">
      <p>
        Ce site n&apos;utilise <strong>aucun cookie publicitaire, aucun pixel de réseau social et aucun outil de mesure d&apos;audience tiers</strong>. Seule
        l&apos;origine de votre visite (campagne, site d&apos;origine) est enregistrée, et uniquement si vous l&apos;acceptez : elle nous aide à savoir quelles
        annonces fonctionnent. Votre choix est conservé 6 mois dans ce navigateur, puis redemandé.
      </p>
      <h2>Ce qui est stocké</h2>
      <table>
        <thead>
          <tr><th>Élément</th><th>Usage</th><th>Durée</th></tr>
        </thead>
        <tbody>
          <tr><td>Stockage de session « pe-simulation »</td><td>Conserver vos réponses pendant le questionnaire (retour en arrière sans perte).</td><td>Jusqu&apos;à la fermeture de l&apos;onglet</td></tr>
          <tr><td>Stockage de session « pe-acq » (avec votre accord)</td><td>Origine de la visite : paramètres de campagne (source, support, campagne) et site d&apos;origine, sans donnée personnelle. Joints à votre demande si vous en envoyez une.</td><td>Jusqu&apos;à la fermeture de l&apos;onglet</td></tr>
          <tr><td>Cookie « pe-consent »</td><td>Mémoriser votre choix ci-dessous (propre à ce site, sans identifiant).</td><td>6 mois</td></tr>
          <tr><td>Cookie de session d&apos;administration</td><td>Authentification de l&apos;équipe (espace réservé), strictement nécessaire.</td><td>12 h maximum</td></tr>
        </tbody>
      </table>
      <p>Les statistiques de parcours sont agrégées par jour et par étape, sans cookie ni identifiant.</p>
      <h2>Vos préférences</h2>
      <ConsentPreferences initialRaw={consentRaw} />
      <ClearLocalData />
    </LegalPage>
  );
}
