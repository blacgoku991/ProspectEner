"use client";

import { CalendarCheck, CircleHelp } from "lucide-react";
import { useActionState, useId, useMemo, useState } from "react";
import { type AppointmentState, bookAppointmentAction } from "@/app/admin/(panel)/demandes/[id]/actions";
import { APPOINTMENT_MODES, type QualificationGroup, qualifiedAids } from "@/lib/admin/qualification";
import { cn } from "@/lib/cn";
import type { MatchStatus } from "@/lib/leads/partners";

/** Entreprise partenaire active, proposée pour assurer le rendez-vous. */
export interface PartnerChoice {
  /** Identifiant de l'entreprise (envoyé au serveur, qui retrouve l'entreprise active). */
  id: string;
  /** Nom annoncé à la personne (dénomination, puis précisions) : c'est lui qui est enregistré sur la demande. */
  name: string;
  /** Correspondance de la demande avec les critères de l'entreprise. */
  match?: MatchStatus;
  /** Entreprise nommée dans la demande (phrase validée par la personne avant l'envoi). */
  requested?: boolean;
}

const MATCH_ORDER: Record<MatchStatus, number> = { MATCH: 0, TO_CHECK: 1, NO: 2 };
const MATCH_SUFFIX: Record<MatchStatus, string> = {
  MATCH: "correspond aux critères",
  TO_CHECK: "critères à vérifier",
  NO: "ne correspond pas aux critères",
};

/**
 * Qualification puis rendez-vous : le conseiller confirme chaque critère avec la personne.
 * Le bouton ne s'active que lorsqu'une aide au moins est entièrement confirmée (contrôlé aussi côté serveur).
 * Une demande qui nomme une entreprise partenaire ne peut être confiée qu'à elle, ou assurée par l'entreprise
 * qui édite le site (contrôlé aussi côté serveur).
 */
export function AppointmentForm({
  requestId,
  groups,
  referral = false,
  partners = [],
  requestedName = null,
}: {
  requestId: string;
  groups: QualificationGroup[];
  /** Mise en relation déclarée dans les paramètres : le rendez-vous peut être confié à une entreprise partenaire. */
  referral?: boolean;
  /** Entreprises partenaires actives (contrôlées aussi côté serveur). */
  partners?: PartnerChoice[];
  /** Entreprise nommée dans la demande (nom affiché), même si elle n'est plus active. */
  requestedName?: string | null;
}) {
  const uid = useId();
  const [state, action] = useActionState<AppointmentState, FormData>(bookAppointmentAction, {});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const requested = partners.find((p) => p.requested);
  // Demande qui nomme une entreprise : seule cette entreprise (si elle est encore active) peut assurer le rendez-vous.
  const restricted = Boolean(requestedName) || Boolean(requested);
  const choices = useMemo(
    () =>
      restricted
        ? partners.filter((p) => p.requested)
        : [...partners].sort((a, b) => MATCH_ORDER[a.match ?? "TO_CHECK"] - MATCH_ORDER[b.match ?? "TO_CHECK"] || a.name.localeCompare(b.name, "fr")),
    [partners, restricted],
  );
  // Entreprise nommée dans la demande, sinon la seule qui correspond à tous les critères : proposée d'office
  // (l'accord pour le rendez-vous reste à cocher).
  const matching = restricted ? [] : choices.filter((p) => p.match === "MATCH");
  const suggested = !referral ? "" : requested ? requested.id : matching.length === 1 ? (matching[0]?.id ?? "") : "";
  const [partnerId, setPartnerId] = useState(suggested);
  const [consent, setConsent] = useState(false);
  const partner = choices.find((p) => p.id === partnerId) ?? null;
  const qualified = useMemo(() => qualifiedAids(groups, checked), [groups, checked]);
  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Raison pour laquelle le rendez-vous ne peut pas encore être fixé : lue avec le bouton, qui reste atteignable au clavier.
  const blockedReason =
    qualified.length === 0
      ? "Le bouton s'active quand une aide est entièrement qualifiée."
      : partner && !consent
        ? "Cochez l'accord de la personne pour la transmission, ou choisissez « Votre entreprise »."
        : null;
  const submitHintId = `${uid}-submit-hint`;
  const partnerHintId = `${uid}-partner-hint`;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (blockedReason) e.preventDefault();
      }}
      className="space-y-5"
    >
      <input type="hidden" name="id" value={requestId} />
      <p className="text-sm text-ink-600">
        Confirmez chaque point avec la personne. Un rendez-vous ne peut être fixé que si tous les critères d&apos;au moins une aide sont confirmés.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map((g) => {
          const done = qualified.includes(g.id);
          return (
            <fieldset key={g.id} className={cn("rounded-xl border p-4", done ? "border-pine-500/40 bg-pine-50/60" : "border-ink-900/10")}>
              <legend className="px-1 text-sm font-semibold text-ink-900">
                {g.name}
                {done && <span className="ml-2 badge bg-pine-100 text-pine-800">Qualifiée</span>}
              </legend>
              <ul className="mt-1 space-y-2">
                {g.items.map((item) => (
                  <li key={item.key}>
                    <label className="flex cursor-pointer gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        name="checked"
                        value={item.key}
                        checked={checked.has(item.key)}
                        onChange={() => toggle(item.key)}
                        className="mt-0.5 size-4 shrink-0 accent-pine-600"
                      />
                      <span>
                        <span className="font-medium text-ink-900">{item.label}</span>
                        {item.declared === "UNKNOWN" && (
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
                            <CircleHelp className="size-3" aria-hidden /> à vérifier
                          </span>
                        )}
                        <span className="block text-xs text-ink-500">{item.detail}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <label className="block text-sm text-ink-800">
          Date et heure (heure de Paris)
          <input type="datetime-local" name="appointmentAt" required className="field-input mt-1 py-2.5 text-sm" />
        </label>
        <label className="block text-sm text-ink-800">
          Mode
          <select name="mode" defaultValue="DOMICILE" className="field-input mt-1 py-2.5 text-sm">
            {Object.entries(APPOINTMENT_MODES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm text-ink-800">
        Projet et précisions <span className="text-ink-500">(facultatif : travaux envisagés, adresse du rendez-vous, accès…)</span>
        <textarea name="note" rows={2} maxLength={1000} className="field-input mt-1 text-sm" />
      </label>
      {referral && (
        <div className="space-y-3 rounded-xl border border-ink-900/10 p-4">
          {choices.length === 0 ? (
            <p className="text-sm text-ink-600">
              {requestedName
                ? `La demande nomme ${requestedName}, qui n'est plus une entreprise partenaire active : le rendez-vous ne peut être assuré que par votre entreprise.`
                : "Aucune entreprise partenaire active : le rendez-vous est assuré par votre entreprise. Les entreprises se déclarent dans « Partenaires »."}
            </p>
          ) : (
            <>
              <label className="block text-sm text-ink-800">
                Entreprise qui assure le rendez-vous
                <select
                  name="partnerId"
                  value={partnerId}
                  onChange={(e) => {
                    setPartnerId(e.target.value);
                    setConsent(false);
                  }}
                  aria-describedby={restricted || matching.length > 0 ? partnerHintId : undefined}
                  className="field-input mt-1 py-2.5 text-sm"
                >
                  <option value="">Votre entreprise (pas de mise en relation)</option>
                  {choices.map((p) => (
                    // Entreprise nommée dans la demande : son nom seul, le rappel figure sous la liste.
                    <option key={p.id} value={p.id}>
                      {!restricted && p.match ? `${p.name} — ${MATCH_SUFFIX[p.match]}` : p.name}
                    </option>
                  ))}
                </select>
              </label>
              {restricted ? (
                <p id={partnerHintId} className="text-xs text-ink-500">
                  La personne a nommé {requested?.name ?? requestedName} dans sa demande : le rendez-vous ne peut être confié qu&apos;à cette entreprise,
                  ou assuré par votre entreprise. Détail dans « Entreprises partenaires ».
                </p>
              ) : (
                matching.length > 0 && (
                  <p id={partnerHintId} className="text-xs text-ink-500">
                    {matching.length === 1
                      ? `La demande correspond à tous les critères de ${matching[0]?.name} : entreprise proposée.`
                      : `La demande correspond à tous les critères de ${matching.length} entreprises : choisissez celle qui assure le rendez-vous.`}{" "}
                    Détail dans « Entreprises partenaires ».
                  </p>
                )
              )}
            </>
          )}
          {partner && (
            <label className="flex cursor-pointer gap-2.5 text-sm">
              <input
                type="checkbox"
                name="partnerConsent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-pine-600"
              />
              <span>
                La personne a accepté que ses coordonnées et ses réponses (logement, chauffage, revenus) soient transmises à <strong>{partner.name}</strong>{" "}
                pour ce rendez-vous.
              </span>
            </label>
          )}
        </div>
      )}
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <p id={submitHintId} aria-live="polite" className="text-xs text-ink-500">
          {blockedReason}
        </p>
        <button
          type="submit"
          aria-disabled={blockedReason ? true : undefined}
          aria-describedby={blockedReason ? submitHintId : undefined}
          onClick={(e) => {
            if (blockedReason) e.preventDefault();
          }}
          className="btn-primary py-3 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        >
          <CalendarCheck className="size-4" aria-hidden />
          Fixer le rendez-vous
        </button>
      </div>
    </form>
  );
}
