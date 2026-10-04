"use client";

import { Loader2, Lock, Mail, MapPin, PhoneCall, Send } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Answers } from "@/engine/types";
import { cn } from "@/lib/cn";
import { trackStep } from "@/lib/funnel";
import { buildRequestSentence, CHANNEL_LABELS, type ChannelChoice, noticeParagraphs } from "@/lib/legal/texts";
import type { PublicConfig } from "@/lib/public-config";
import {
  AVAILABILITY_DAYS,
  AVAILABILITY_SLOTS,
  contactSchema,
  DAY_LABELS,
  SLOT_LABELS,
} from "@/lib/validation/contact";
import { readAcquisition } from "./acquisition";
import { Turnstile } from "./Turnstile";

export interface SubmitSuccess {
  reference: string;
  cancelToken: string;
  channel: ChannelChoice;
  callbackDeadline: string | null;
  requestSentence: string;
}

interface Props {
  kind: "SIMULATION" | "QUICK_CALLBACK";
  config: PublicConfig;
  answers: Answers;
  ruleSetVersion?: string;
  referenceDate?: string;
  locationLabel: string;
  worksText: string;
  /** Validation des champs propres au formulaire parent (rappel rapide). */
  validateExtra?: () => boolean;
  onSuccess: (r: SubmitSuccess) => void;
}

type FieldErrors = Partial<Record<"firstName" | "lastName" | "channel" | "email" | "phone" | "comment" | "confirmRequest" | "form", string>>;

export function ContactForm({ kind, config, answers, ruleSetVersion, referenceDate, locationLabel, worksText, validateExtra, onSuccess }: Props) {
  const id = useId();
  const channelsAvailable = (["PHONE", "EMAIL"] as const).filter((c) => (c === "PHONE" ? config.channels.phone : config.channels.email));
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const startedAt = useRef<number | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [channel, setChannel] = useState<ChannelChoice | null>(channelsAvailable.length === 1 ? channelsAvailable[0]! : null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState<(typeof AVAILABILITY_DAYS)[number][]>([]);
  const [slots, setSlots] = useState<(typeof AVAILABILITY_SLOTS)[number][]>([]);
  const [comment, setComment] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    startedAt.current = performance.now();
    trackStep(kind === "SIMULATION" ? "contact_form" : "quick_form");
  }, [kind]);

  const sentence = channel ? buildRequestSentence(config.companyName, channel, worksText) : null;

  const contactInput = () => ({
    firstName,
    lastName,
    channel: channel ?? undefined,
    email: channel === "EMAIL" ? email : "",
    phone: channel === "PHONE" ? phone : "",
    availability: channel === "PHONE" && (days.length || slots.length) ? { days, slots } : undefined,
    comment: comment.trim() ? comment : undefined,
    confirmRequest: confirm,
  });

  const validate = (): boolean => {
    const parsed = contactSchema.safeParse(contactInput());
    const next: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = (issue.path[0] as keyof FieldErrors) ?? "form";
        if (!next[key]) next[key] = key === "channel" ? "Choisissez comment vous souhaitez être recontacté(e)." : issue.message;
      }
    }
    setErrors(next);
    return parsed.success;
  };

  const validateField = (field: keyof FieldErrors) => {
    const parsed = contactSchema.safeParse(contactInput());
    const issue = parsed.success ? undefined : parsed.error.issues.find((i) => i.path[0] === field);
    setErrors((e) => ({ ...e, [field]: issue?.message }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return; // double-clic : une seule requête à la fois
    const extraOk = validateExtra ? validateExtra() : true;
    if (!validate() || !extraOk) return;
    inFlight.current = true;
    setSubmitting(true);
    setErrors({});
    const contact = contactSchema.parse(contactInput());
    const body = {
      kind,
      idempotencyKey,
      answers,
      ...(kind === "SIMULATION" ? { ruleSetVersion, referenceDate } : {}),
      contact: { ...contact, email: contact.email ?? "", phone: contact.phone ?? "" },
      noticeHash: config.notice.hash,
      acquisition: readAcquisition(),
      website,
      formElapsedMs: Math.round(performance.now() - (startedAt.current ?? performance.now())),
      ...(turnstileToken ? { turnstileToken } : {}),
    };
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<SubmitSuccess> & {
        code?: string;
        message?: string;
        fieldErrors?: Record<string, string>;
      };
      if (res.ok && data.reference && data.cancelToken && data.channel && data.requestSentence) {
        trackStep("submitted");
        onSuccess({
          reference: data.reference,
          cancelToken: data.cancelToken,
          channel: data.channel,
          callbackDeadline: data.callbackDeadline ?? null,
          requestSentence: data.requestSentence,
        });
        return;
      }
      const fe: FieldErrors = { form: data.message ?? "L'envoi n'a pas abouti. Merci de réessayer." };
      for (const [k, v] of Object.entries(data.fieldErrors ?? {})) {
        const field = k.startsWith("contact.") ? (k.slice(8) as keyof FieldErrors) : undefined;
        if (field) fe[field] = v;
      }
      setErrors(fe);
    } catch {
      setErrors({ form: "Connexion impossible. Vérifiez votre réseau puis réessayez : votre demande ne sera pas envoyée deux fois." });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (!config.submissionsOpen) {
    return (
      <div className="card p-6 text-ink-700">
        <p className="font-semibold text-ink-900">Le formulaire de contact n&apos;est pas encore ouvert.</p>
        <p className="mt-2 text-sm">
          Les informations de l&apos;entreprise doivent être complétées par l&apos;éditeur du site avant de pouvoir recevoir des demandes.
        </p>
      </div>
    );
  }

  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <form onSubmit={submit} noValidate className="space-y-7" aria-describedby={`${id}-intro`}>
      <p id={`${id}-intro`} className="text-sm text-ink-600">
        Tous les champs sont obligatoires sauf mention « facultatif ».
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-fn`} className="field-label">Prénom</label>
          <input id={`${id}-fn`} className="field-input" autoComplete="given-name" value={firstName} maxLength={80}
            aria-invalid={Boolean(errors.firstName)} aria-describedby={errors.firstName ? `${id}-fn-e` : undefined}
            onChange={(e) => setFirstName(e.target.value)} onBlur={() => firstName && validateField("firstName")} />
          {errors.firstName && <p id={`${id}-fn-e`} className="field-error">{errors.firstName}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-ln`} className="field-label">Nom</label>
          <input id={`${id}-ln`} className="field-input" autoComplete="family-name" value={lastName} maxLength={80}
            aria-invalid={Boolean(errors.lastName)} aria-describedby={errors.lastName ? `${id}-ln-e` : undefined}
            onChange={(e) => setLastName(e.target.value)} onBlur={() => lastName && validateField("lastName")} />
          {errors.lastName && <p id={`${id}-ln-e`} className="field-error">{errors.lastName}</p>}
        </div>
      </div>

      <fieldset>
        <legend className="field-label">Comment souhaitez-vous être recontacté(e) ?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {channelsAvailable.map((c) => {
            const Icon = c === "PHONE" ? PhoneCall : Mail;
            const selected = channel === c;
            return (
              <button key={c} type="button" aria-pressed={selected}
                onClick={() => { setChannel(c); setConfirm(false); setErrors((e) => ({ ...e, channel: undefined, confirmRequest: undefined })); }}
                className={cn("flex items-center gap-3 rounded-2xl border-2 bg-white px-4 py-4 text-left transition",
                  selected ? "border-pine-500 bg-pine-50 shadow-glow" : "border-ink-900/[0.08] hover:border-pine-300")}>
                <span className={cn("grid size-10 place-items-center rounded-xl", selected ? "bg-pine-600 text-white" : "bg-sand-100 text-ink-700")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-ink-900">{c === "PHONE" ? "Être rappelé(e) par téléphone" : "Recevoir une réponse par e-mail"}</span>
                  {c === "PHONE" && <span className="text-sm text-ink-500">Dans les {config.callbackDelayBusinessDays} jours ouvrables suivant la demande</span>}
                </span>
              </button>
            );
          })}
        </div>
        {errors.channel && <p className="field-error">{errors.channel}</p>}
        {config.companyPhone && (
          <p className="mt-3 text-sm text-ink-600">
            Vous pouvez aussi nous appeler directement : <a className="font-semibold text-pine-700 underline" href={`tel:${config.companyPhone.replace(/\s/g, "")}`}>{config.companyPhone}</a>
          </p>
        )}
      </fieldset>

      {channel === "EMAIL" && (
        <div>
          <label htmlFor={`${id}-em`} className="field-label">Adresse e-mail</label>
          <input id={`${id}-em`} type="email" inputMode="email" autoComplete="email" className="field-input" value={email} maxLength={160}
            aria-invalid={Boolean(errors.email)} onChange={(e) => setEmail(e.target.value)} onBlur={() => email && validateField("email")} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
      )}

      {channel === "PHONE" && (
        <div className="space-y-5">
          <div>
            <label htmlFor={`${id}-ph`} className="field-label">Numéro de téléphone</label>
            <input id={`${id}-ph`} type="tel" inputMode="tel" autoComplete="tel" className="field-input max-w-xs" value={phone} maxLength={30}
              placeholder="06 12 34 56 78" aria-invalid={Boolean(errors.phone)} onChange={(e) => setPhone(e.target.value)} onBlur={() => phone && validateField("phone")} />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>
          <fieldset>
            <legend className="field-label">Vos disponibilités <span className="font-normal text-ink-500">(facultatif)</span></legend>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_DAYS.map((d) => (
                <button key={d} type="button" aria-pressed={days.includes(d)} onClick={() => toggle(days, d, setDays)}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm transition", days.includes(d) ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-white text-ink-700")}>
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVAILABILITY_SLOTS.map((s) => (
                <button key={s} type="button" aria-pressed={slots.includes(s)} onClick={() => toggle(slots, s, setSlots)}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm transition", slots.includes(s) ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-white text-ink-700")}>
                  {SLOT_LABELS[s]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink-700">
        <MapPin className="size-4 shrink-0 text-ink-500" aria-hidden />
        Logement : <strong className="font-semibold">{locationLabel}</strong>
      </div>

      <div>
        <label htmlFor={`${id}-cm`} className="field-label">Commentaire <span className="font-normal text-ink-500">(facultatif)</span></label>
        <textarea id={`${id}-cm`} rows={3} maxLength={1000} className="field-input resize-y" value={comment} onChange={(e) => setComment(e.target.value)}
          aria-describedby={`${id}-cm-h`} />
        <p id={`${id}-cm-h`} className="field-help">
          {comment.length}/1000 — n&apos;indiquez pas d&apos;informations sensibles (santé, données bancaires ou fiscales…).
        </p>
      </div>

      {/* Champ piège pour les robots : invisible et ignoré par les lecteurs d'écran */}
      <div aria-hidden className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`${id}-web`}>Ne pas remplir</label>
        <input id={`${id}-web`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <section aria-labelledby={`${id}-rgpd`} className="rounded-2xl border border-ink-900/10 bg-white p-4 sm:p-5">
        <h3 id={`${id}-rgpd`} className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Lock className="size-4 text-pine-600" aria-hidden /> Informations sur vos données
        </h3>
        <div className="max-h-56 space-y-2 overflow-y-auto pr-2 text-[13px] leading-relaxed text-ink-600" tabIndex={0}>
          {noticeParagraphs(config.notice.text).map((p) => <p key={p}>{p}</p>)}
        </div>
        <p className="mt-2 text-xs text-ink-500">
          <a href="/confidentialite" target="_blank" className="underline">Politique de confidentialité complète</a>
        </p>
      </section>

      <div className={cn("rounded-2xl border-2 p-4 transition", confirm ? "border-pine-500 bg-pine-50" : "border-ink-900/10 bg-white", errors.confirmRequest && "border-red-400")}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={confirm} disabled={!channel}
            onChange={(e) => { setConfirm(e.target.checked); setErrors((x) => ({ ...x, confirmRequest: undefined })); }}
            className="mt-1 size-5 shrink-0 accent-pine-600" aria-describedby={errors.confirmRequest ? `${id}-cf-e` : undefined} />
          <span className="text-[15px] font-medium text-ink-900">
            {sentence ?? `Je demande à être contacté(e) par ${config.companyName}, par [choisissez un canal ci-dessus], au sujet de mon projet de ${worksText}.`}
          </span>
        </label>
        <p className="mt-2 pl-8 text-xs text-ink-500">
          Demande ponctuelle : elle ne vaut ni inscription à une lettre d&apos;information, ni accord pour d&apos;autres sollicitations.
        </p>
        {errors.confirmRequest && <p id={`${id}-cf-e`} className="field-error pl-8">{errors.confirmRequest}</p>}
      </div>

      {config.turnstileSiteKey && <Turnstile siteKey={config.turnstileSiteKey} onToken={setTurnstileToken} />}

      {errors.form && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errors.form}</p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-4 text-base sm:w-auto sm:px-10">
        {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}
        {submitting ? "Envoi en cours…" : "Envoyer ma demande"}
      </button>
      {channel && <p className="text-xs text-ink-500">Canal choisi : {CHANNEL_LABELS[channel]}. Aucun dossier d&apos;aide ne sera déposé par cet envoi.</p>}
    </form>
  );
}
