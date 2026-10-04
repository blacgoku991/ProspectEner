import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Field, LegalPage } from "@/components/site/LegalPage";
import { FranceRenovNotice } from "@/components/site/FranceRenovNotice";
import { siteSettings } from "@/lib/site-data";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "Contact", description: "Coordonnées de l'éditeur du site et moyens de contact.", path: "/contact" });
}

export default async function ContactPage() {
  const s = await siteSettings();
  const c = s.company;
  return (
    <LegalPage title="Contact">
      <h2>Nous écrire ou nous appeler</h2>
      <ul>
        <li>Entreprise : <Field value={c.name} /></li>
        <li>Adresse : <Field value={c.address} /></li>
        <li>Téléphone : {c.phone ? <a href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a> : <Field value="" />}</li>
        <li>E-mail : {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <Field value="" />}</li>
      </ul>
      <h2>Votre projet</h2>
      <p>
        Vous pouvez <Link href="/simulation">tester votre pré-éligibilité</Link> puis demander une étude, ou{" "}
        <Link href="/rappel">demander directement à être recontacté(e)</Link>.
      </p>
      <h2>Données personnelles</h2>
      <p>
        Pour exercer vos droits : <Field value={c.privacyContact || c.email} />. Pour annuler une demande : <Link href="/annulation">Annuler une demande</Link>.
      </p>
      <h2>Le service public de la rénovation</h2>
      <FranceRenovNotice />
    </LegalPage>
  );
}
