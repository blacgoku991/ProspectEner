"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ACCEPTED_OUTCOMES_LABELS, ACTIVITY_KINDS, ACTIVITY_LABELS, type SiteSettings } from "@/lib/settings-schema";
import { applyRetentionAction, retryNotificationsAction, saveSettingsAction, type SettingsState, testNotificationAction } from "./actions";

function Feedback({ state }: { state: SettingsState }) {
  if (state.ok) return <p role="status" className="text-sm font-medium text-pine-700">{state.ok}</p>;
  if (state.error) return <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>;
  return null;
}

function SectionForm({ section, children, submit = "Enregistrer" }: { section: string; children: React.ReactNode; submit?: string }) {
  const [state, action] = useActionState<SettingsState, FormData>(saveSettingsAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="section" value={section} />
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="py-2.5">{submit}</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

const Input = ({ name, label, value, type = "text", help }: { name: string; label: string; value: string | number; type?: string; help?: string }) => (
  <label className="block text-sm text-ink-800">
    {label}
    <input name={name} type={type} defaultValue={value} className="field-input mt-1 py-2.5 text-sm" />
    {help && <span className="field-help block">{help}</span>}
  </label>
);

const Check = ({ name, label, checked, help }: { name: string; label: string; checked: boolean; help?: string }) => (
  <label className="flex items-start gap-2.5 text-sm text-ink-800">
    <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 size-4 accent-pine-600" />
    <span>
      {label}
      {help && <span className="block text-xs text-ink-500">{help}</span>}
    </span>
  </label>
);

export function CompanyForm({ s }: { s: SiteSettings }) {
  const c = s.company;
  return (
    <SectionForm section="company">
      <p className="text-sm text-ink-600">Ces informations alimentent les mentions légales, la notice RGPD et la phrase de demande de contact. N&apos;inscrivez que des informations exactes.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="name" label="Dénomination *" value={c.name} />
        <Input name="legalForm" label="Forme juridique" value={c.legalForm} help="Ex. SAS, SARL…" />
        <Input name="shareCapital" label="Capital social" value={c.shareCapital} />
        <Input name="registration" label="Immatriculation (RCS / RNE, SIREN)" value={c.registration} />
        <Input name="address" label="Adresse du siège *" value={c.address} />
        <Input name="vatNumber" label="N° de TVA intracommunautaire" value={c.vatNumber} />
        <Input name="phone" label="Téléphone" value={c.phone} />
        <Input name="email" label="E-mail de contact" value={c.email} type="email" />
        <Input name="publicationDirector" label="Directeur de la publication" value={c.publicationDirector} />
        <Input name="privacyContact" label="Contact données personnelles (DPO ou référent) *" value={c.privacyContact} help="Adresse e-mail ou postale pour l'exercice des droits." />
        <Input name="hostName" label="Hébergeur — nom" value={c.hostName} />
        <Input name="hostAddress" label="Hébergeur — adresse" value={c.hostAddress} />
        <Input name="hostPhone" label="Hébergeur — téléphone" value={c.hostPhone} />
        <Input name="dataTransfersInfo" label="Localisation des données / transferts hors UE" value={c.dataTransfersInfo} />
        <Input name="mediatorName" label="Médiateur de la consommation — nom" value={c.mediatorName} />
        <Input name="mediatorWebsite" label="Médiateur — site web" value={c.mediatorWebsite} />
        <Input name="mediatorAddress" label="Médiateur — adresse" value={c.mediatorAddress} />
      </div>
    </SectionForm>
  );
}

export function ActivityForm({ s }: { s: SiteSettings }) {
  return (
    <SectionForm section="activity">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-800">Activité réellement exercée</legend>
        <div className="flex flex-wrap gap-4">
          {ACTIVITY_KINDS.map((k) => (
            <Check key={k} name={`kind-${k}`} label={ACTIVITY_LABELS[k]} checked={s.activity.kinds.includes(k)} />
          ))}
        </div>
      </fieldset>
      <label className="block text-sm text-ink-800">
        Présentation (page d&apos;accueil et mentions légales)
        <textarea name="description" defaultValue={s.activity.description} rows={4} maxLength={1500} className="field-input mt-1 text-sm" />
      </label>
      <label className="block text-sm text-ink-800">
        Qualifications (RGE, assurances…) — uniquement si réelles et en cours de validité
        <textarea name="qualifications" defaultValue={s.activity.qualifications} rows={2} maxLength={1000} className="field-input mt-1 text-sm" />
      </label>
      <Input name="interventionArea" label="Zone d'intervention" value={s.activity.interventionArea} />
    </SectionForm>
  );
}

export function ContactForm({ s }: { s: SiteSettings }) {
  const reviewed = s.contact.phoneCallbackReviewedAt;
  return (
    <SectionForm section="contact">
      <fieldset className="space-y-3 rounded-xl border border-ink-900/10 p-4">
        <legend className="px-1 text-sm font-semibold text-ink-900">Qualification des demandes</legend>
        <label className="block text-sm text-ink-800">
          Test proposé aux visiteurs
          <select name="testMode" defaultValue={s.test.mode} className="field-input mt-1 py-2.5 text-sm">
            <option value="PROJET">Test complet : équipement actuel et travaux souhaités (recommandé)</option>
            <option value="ELIGIBILITE">Test d&apos;éligibilité seul : le projet est vu ensuite avec un conseiller</option>
          </select>
        </label>
        <label className="block text-sm text-ink-800">
          Demandes de rendez-vous proposées après le test
          <select name="acceptedOutcomes" defaultValue={s.contact.acceptedOutcomes} className="field-input mt-1 py-2.5 text-sm">
            {(Object.keys(ACCEPTED_OUTCOMES_LABELS) as (keyof typeof ACCEPTED_OUTCOMES_LABELS)[]).map((k) => (
              <option key={k} value={k}>
                {ACCEPTED_OUTCOMES_LABELS[k]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-ink-500">
            Un visiteur dont les réponses ne remplissent pas les conditions voit son résultat, sans formulaire de contact : il est orienté vers France
            Rénov&apos;.
          </span>
        </label>
        <Check
          name="quickCallbackEnabled"
          label="Proposer « Être recontacté(e) sans faire le test » (demandes non qualifiées)"
          checked={s.contact.quickCallbackEnabled}
        />
      </fieldset>
      <Check name="emailReplyEnabled" label="Proposer une réponse par e-mail" checked={s.contact.emailReplyEnabled} />
      <Check name="showCompanyPhone" label="Afficher le numéro de l'entreprise (appel entrant à l'initiative du visiteur)" checked={s.contact.showCompanyPhone} />
      <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Rappel téléphonique — avertissement juridique</p>
        <p>
          La prospection téléphonique est interdite pour la rénovation énergétique, même avec consentement (art. L223-1 du Code de la consommation).
          Un appel n&apos;est pas de la prospection s&apos;il répond à une demande explicite et prouvée, intervient dans les cinq jours ouvrables suivant la
          demande et porte uniquement sur l&apos;objet demandé (art. R223-4, décret n° 2026-662). Une fiche pratique de la DGCCRF indique toutefois que
          rappeler une personne ayant laissé ses coordonnées sur un simulateur n&apos;est pas considéré comme conforme : faites valider votre pratique par
          un conseil juridique avant d&apos;activer ce canal.
        </p>
        <Check name="phoneCallbackEnabled" label="Proposer le rappel téléphonique" checked={s.contact.phoneCallbackEnabled} />
        {!reviewed && <Check name="phoneCallbackConfirm" label="J'ai pris connaissance de cet avertissement et j'active ce canal sous la responsabilité de l'entreprise." checked={false} />}
        {reviewed && <p className="text-xs">Activé le {new Date(reviewed).toLocaleString("fr-FR")} par {s.contact.phoneCallbackReviewedBy}.</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="callbackDelayBusinessDays" label="Délai de rappel (jours ouvrables, 5 maximum)" value={s.contact.callbackDelayBusinessDays} type="number" />
        <div className="pt-6"><Check name="alsaceMoselleHolidays" label="Inclure les jours fériés d'Alsace-Moselle" checked={s.contact.alsaceMoselleHolidays} /></div>
      </div>
    </SectionForm>
  );
}

export function NotificationsForm({ s, transports }: { s: SiteSettings; transports: { email: boolean; webhook: boolean } }) {
  const [testState, testAction] = useActionState<SettingsState>(testNotificationAction, {});
  const [retryState, retryAction] = useActionState<SettingsState>(retryNotificationsAction, {});
  return (
    <div className="space-y-4">
      <SectionForm section="notifications">
        <p className="text-sm text-ink-600">
          Chaque nouvelle demande déclenche un message contenant uniquement sa référence et un lien vers la fiche sécurisée. Transport e-mail :{" "}
          <strong>{transports.email ? "configuré" : "non configuré (variables SMTP_*)"}</strong> · webhook :{" "}
          <strong>{transports.webhook ? "secret configuré" : "secret non configuré (NOTIFY_WEBHOOK_SECRET)"}</strong>.
        </p>
        <label className="block text-sm text-ink-800">
          Destinataires e-mail (séparés par des virgules)
          <input name="emailRecipients" defaultValue={s.notifications.emailRecipients.join(", ")} className="field-input mt-1 py-2.5 text-sm" />
        </label>
        <Input name="webhookUrl" label="URL du webhook (HTTPS)" value={s.notifications.webhookUrl} help="Requête POST signée (en-tête x-prospectener-signature, HMAC-SHA256)." />
        <Check name="notifyOnCancellation" label="Notifier aussi les annulations" checked={s.notifications.notifyOnCancellation} />
      </SectionForm>
      <div className="flex flex-wrap items-center gap-3 border-t border-ink-900/[0.06] pt-4">
        <form action={testAction}><SubmitButton variant="ghost" className="py-2">Envoyer un test</SubmitButton></form>
        <form action={retryAction}><SubmitButton variant="ghost" className="py-2">Relancer les envois en échec</SubmitButton></form>
        <Feedback state={testState} />
        <Feedback state={retryState} />
      </div>
    </div>
  );
}

export function RetentionForm({ s, preview }: { s: SiteSettings; preview: { cancelled: number; expired: number; proofs: number; auditLogs: number; oppositions: number } }) {
  const [state, action] = useActionState<SettingsState>(applyRetentionAction, {});
  const r = s.retention;
  return (
    <div className="space-y-4">
      <SectionForm section="retention">
        <div className="grid gap-4 md:grid-cols-3">
          <Input name="requestMonths" type="number" label="Demandes (mois depuis la demande ou le dernier échange)" value={r.requestMonths} help="CNIL : 3 ans à compter de la collecte ou du dernier contact émanant de la personne." />
          <Input name="cancelledRequestDays" type="number" label="Demandes annulées (jours avant effacement)" value={r.cancelledRequestDays} />
          <Input name="proofMonths" type="number" label="Preuve de la demande (mois)" value={r.proofMonths} help="Art. R223-4 : justificatifs conservés 3 ans." />
          <Input name="auditLogMonths" type="number" label="Journal de sécurité (mois)" value={r.auditLogMonths} help="CNIL : 6 mois à 1 an." />
          <Input name="oppositionMonths" type="number" label="Liste d'opposition (mois)" value={r.oppositionMonths} help="CNIL : au moins 3 ans." />
          <Input name="funnelStatsMonths" type="number" label="Statistiques agrégées (mois)" value={r.funnelStatsMonths} />
        </div>
      </SectionForm>
      <div className="rounded-xl bg-sand-100 p-4 text-sm text-ink-700">
        <p>
          Prochaine application : {preview.cancelled} demande(s) annulée(s) et {preview.expired} demande(s) échue(s) à anonymiser, {preview.proofs} preuve(s) à
          purger, {preview.auditLogs} entrée(s) de journal et {preview.oppositions} opposition(s) expirées. La tâche planifiée (/api/cron) l&apos;applique
          automatiquement.
        </p>
        <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
          <SubmitButton variant="dark" className="py-2" confirm="Appliquer maintenant la politique de conservation ? Les anonymisations sont définitives.">Appliquer maintenant</SubmitButton>
          <Feedback state={state} />
        </form>
      </div>
    </div>
  );
}

export function SecurityForm({ s }: { s: SiteSettings }) {
  return (
    <SectionForm section="security">
      <Check name="requireMfaForCollaborators" label="Double authentification obligatoire aussi pour les collaborateurs" checked={s.security.requireMfaForCollaborators} help="Toujours obligatoire pour les administrateurs." />
      <Check name="collaboratorsSeeUnassigned" label="Les collaborateurs voient les demandes non assignées" checked={s.security.collaboratorsSeeUnassigned} />
      <Check name="collectCampaignParams" label="Collecter les paramètres de campagne (utm) avec les demandes" checked={s.acquisition.collectCampaignParams} help="Sans donnée personnelle ; mentionné dans la politique de confidentialité." />
    </SectionForm>
  );
}

export function LaunchForm({ s }: { s: SiteSettings }) {
  return (
    <SectionForm section="launch" submit="Enregistrer les validations">
      <Check
        name="rulesReviewed"
        label="Les règles du barème publié ont été relues directement sur les sources officielles"
        checked={Boolean(s.launch.rulesReviewedAt)}
        help={s.launch.rulesReviewedAt ? `Confirmé le ${new Date(s.launch.rulesReviewedAt).toLocaleString("fr-FR")} par ${s.launch.rulesReviewedBy}` : "La vérification initiale a été faite par extraits ; une lecture directe est attendue."}
      />
      <Check
        name="legalReviewed"
        label="Mentions légales, politique de confidentialité et pratique de rappel validées juridiquement"
        checked={Boolean(s.launch.legalReviewedAt)}
        help={s.launch.legalReviewedAt ? `Confirmé le ${new Date(s.launch.legalReviewedAt).toLocaleString("fr-FR")} par ${s.launch.legalReviewedBy}` : "Voir docs/CONFORMITE.md."}
      />
    </SectionForm>
  );
}
