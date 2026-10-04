import type { Metadata } from "next";
import { ClearLocalData } from "@/components/site/ClearLocalData";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Cookies et préférences" };

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies et préférences">
      <p>
        Ce site n&apos;utilise <strong>aucun cookie publicitaire, aucun pixel de réseau social et aucun outil de mesure d&apos;audience tiers</strong>. Aucun
        bandeau de consentement n&apos;est donc nécessaire. Si de tels outils étaient ajoutés, votre consentement serait recueilli au préalable.
      </p>
      <h2>Ce qui est stocké</h2>
      <table>
        <thead>
          <tr><th>Élément</th><th>Usage</th><th>Durée</th></tr>
        </thead>
        <tbody>
          <tr><td>Stockage de session « pe-simulation »</td><td>Conserver vos réponses pendant le questionnaire (retour en arrière sans perte).</td><td>Jusqu&apos;à la fermeture de l&apos;onglet</td></tr>
          <tr><td>Stockage de session « pe-acq »</td><td>Paramètres de campagne de la visite (source, support, campagne), sans donnée personnelle.</td><td>Jusqu&apos;à la fermeture de l&apos;onglet</td></tr>
          <tr><td>Cookie de session d&apos;administration</td><td>Authentification de l&apos;équipe (espace réservé), strictement nécessaire.</td><td>12 h maximum</td></tr>
        </tbody>
      </table>
      <p>Les statistiques de parcours sont agrégées par jour et par étape, sans cookie ni identifiant.</p>
      <h2>Vos préférences</h2>
      <ClearLocalData />
    </LegalPage>
  );
}
