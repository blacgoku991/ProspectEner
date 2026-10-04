import { ArrowLeft, CalendarClock, CircleAlert, Clock, Mail, MessageSquare, Phone, PhoneOff, ShieldBan } from "lucide-react";
import Link from "next/link";
import { EvaluationDetails } from "@/components/evaluation/EvaluationDetails";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert, Panel } from "@/components/admin/ui";
import { summarizeAnswers, validateRuleSetData, WORK_CATEGORY_LABELS, type Answers, type Evaluation } from "@/engine";
import type { WorkCategory } from "@/engine/types";
import { callbackState } from "@/lib/admin/requests";
import { audit } from "@/lib/audit";
import { getAccessibleRequestId, requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { noticeParagraphs } from "@/lib/legal/texts";
import { requestContext } from "@/lib/request-context";
import { CHANNEL_LONG_LABELS, KIND_LABELS, OUTCOME_LABELS, STATUS_LABELS } from "@/lib/requests/shared";
import { getPublishedRuleSet } from "@/lib/rulesets";
import { DAY_LABELS, formatFrenchPhone, SLOT_LABELS } from "@/lib/validation/contact";
import {
  addNoteAction,
  anonymizeAction,
  assignAction,
  deleteAction,
  logContactAction,
  recordOppositionAction,
  updateStatusAction,
} from "./actions";

export const metadata = { title: "Fiche demande" };

const dt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Paris" });
const dts = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

const EVENT_LABELS: Record<string, string> = {
  CREATED: "Demande reçue",
  STATUS_CHANGED: "Statut modifié",
  ASSIGNED: "Assignation modifiée",
  NOTE_ADDED: "Note interne ajoutée",
  CONTACT_LOGGED: "Contact enregistré",
  CANCELLED_BY_VISITOR: "Annulée par le visiteur",
  OPPOSITION_RECORDED: "Opposition enregistrée",
  ANONYMIZED: "Données anonymisées",
};

const CONTACT_OUTCOME_LABELS: Record<string, string> = {
  CALL_NO_ANSWER: "appel sans réponse",
  CALL_REACHED: "appel abouti",
  EMAIL_SENT: "e-mail envoyé",
  PROSPECT_REPLIED: "réponse de la personne",
};

function eventDetail(type: string, data: unknown): string {
  const d = (data ?? {}) as Record<string, unknown>;
  if (type === "STATUS_CHANGED") return `${STATUS_LABELS[d.from as keyof typeof STATUS_LABELS] ?? d.from} → ${STATUS_LABELS[d.to as keyof typeof STATUS_LABELS] ?? d.to}`;
  if (type === "CONTACT_LOGGED") return CONTACT_OUTCOME_LABELS[String(d.outcome)] ?? "";
  if (type === "ANONYMIZED") return String(d.reason ?? "");
  if (type === "CREATED") return `${KIND_LABELS[d.kind as keyof typeof KIND_LABELS] ?? ""}${d.oppositionMatch ? " — contact présent dans la liste d'opposition" : ""}`;
  return "";
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff();
  const { id: rawId } = await params;
  const id = await getAccessibleRequestId(ctx, rawId);
  const r = await prisma.contactRequest.findUniqueOrThrow({
    where: { id },
    include: {
      assignedTo: { select: { id: true, displayName: true } },
      noticeText: true,
      ruleSet: true,
      notes: { include: { author: { select: { displayName: true } } }, orderBy: { createdAt: "desc" } },
      events: { include: { actor: { select: { displayName: true } } }, orderBy: { createdAt: "desc" } },
      notifications: { select: { channel: true, status: true, attempts: true, lastError: true } },
    },
  });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "REQUEST_VIEWED", targetType: "ContactRequest", targetId: id, ip });

  const staff = await prisma.staffUser.findMany({ where: { isActive: true }, select: { id: true, displayName: true }, orderBy: { displayName: "asc" } });
  const ruleData = r.ruleSet ? validateRuleSetData(r.ruleSet.data) : null;
  const rules = ruleData?.ok ? ruleData.data : (await getPublishedRuleSet()).data;
  const evaluation = r.evaluation as unknown as Evaluation | null;
  const answers = r.answers as unknown as Answers;
  const summary = summarizeAnswers(answers, { rules, referenceDate: evaluation?.referenceDate ?? r.createdAt.toISOString().slice(0, 10) });
  const cb = callbackState(r, ctx.settings);
  const isAdmin = ctx.user.role === "ADMIN";
  const closed = ["TERMINE", "SANS_SUITE", "CONTACT_ANNULE"].includes(r.status);
  const name = [r.firstName, r.lastName].filter(Boolean).join(" ");
  const availability = r.availability as { days?: (keyof typeof DAY_LABELS)[]; slots?: (keyof typeof SLOT_LABELS)[] } | null;
  const callAllowed = r.channel === "PHONE" && !closed && !r.anonymizedAt && cb.state !== "OVERDUE";
  const works = r.projectTypes.map((p) => WORK_CATEGORY_LABELS[p as WorkCategory] ?? p).join(", ");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/demandes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
          <ArrowLeft className="size-4" aria-hidden /> Demandes
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-bold tracking-tight text-ink-950">{r.anonymizedAt ? "Demande anonymisée" : name}</h1>
            <p className="mt-1 text-sm text-ink-600">
              <span className="font-mono">{r.reference}</span> · reçue le {dts.format(r.createdAt)} · {KIND_LABELS[r.kind]} · {CHANNEL_LONG_LABELS[r.channel]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {r.isDemo && <span className="badge bg-violet-100 text-violet-800">Donnée de démonstration</span>}
            <span className="badge bg-ink-900 text-white">{STATUS_LABELS[r.status]}</span>
            <span className="badge bg-sand-200 text-ink-800">Résultat : {OUTCOME_LABELS[r.overallOutcome]}</span>
          </div>
        </div>
      </div>

      {r.oppositionMatch && (
        <Alert tone="critical">
          Le contact figurait dans la liste d&apos;opposition au moment de la demande. La demande explicite reste valable pour y répondre, mais vérifiez la
          situation avant tout contact.
        </Alert>
      )}

      {r.channel === "PHONE" && !r.anonymizedAt && (
        <Panel title="Rappel téléphonique — cadre de la demande">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-5 text-ink-500" aria-hidden />
              <div>
                <p className="text-sm text-ink-600">Échéance de réponse ({ctx.settings.contact.callbackDelayBusinessDays} jours ouvrables)</p>
                <p className="font-semibold text-ink-900">{r.callbackDeadline ? dt.format(r.callbackDeadline) : "—"}</p>
                {cb.state === "IN_WINDOW" || cb.state === "SOON" ? (
                  <p className={cb.state === "SOON" ? "text-sm font-semibold text-amber-700" : "text-sm text-ink-600"}>{cb.remaining} jour(s) ouvrable(s) restant(s)</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 text-ink-500" aria-hidden />
              <div>
                <p className="text-sm text-ink-600">Créneau recommandé en ce moment</p>
                <p className="font-semibold text-ink-900">{cb.callWindow ? "Oui (lun.-ven., 10h-13h / 14h-20h)" : "Non — lun.-ven. 10h-13h / 14h-20h, hors jours fériés"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 size-5 text-ink-500" aria-hidden />
              <div>
                <p className="text-sm text-ink-600">Tentatives d&apos;appel enregistrées</p>
                <p className={r.contactAttempts >= 4 ? "font-semibold text-red-700" : "font-semibold text-ink-900"}>
                  {r.contactAttempts}
                  {r.contactAttempts >= 4 ? " — limite de prudence atteinte (4 sur 30 jours)" : " / 4 maximum recommandé"}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink-700">
            <strong>Objet strict de l&apos;appel :</strong> {works || "projet indiqué"} — « {r.requestSentence} ». L&apos;appel ne doit porter que sur cette demande
            (art. R223-4 du Code de la consommation) ; il ne vaut pas autorisation de prospection ultérieure.
          </p>
          {cb.state === "OVERDUE" && (
            <div className="mt-4">
              <Alert tone="critical">
                <strong>Délai de réponse dépassé sans contact.</strong> Un appel n&apos;est plus couvert par la demande : ne pas appeler. Clôturez la demande
                ou attendez une nouvelle demande de la personne.
              </Alert>
            </div>
          )}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Coordonnées et demande">
            {r.anonymizedAt ? (
              <p className="text-sm text-ink-500">Coordonnées effacées le {dts.format(r.anonymizedAt)}.</p>
            ) : (
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div><dt className="text-ink-500">Nom</dt><dd className="font-medium text-ink-900">{name}</dd></div>
                <div><dt className="text-ink-500">Canal demandé</dt><dd className="font-medium text-ink-900">{CHANNEL_LONG_LABELS[r.channel]}</dd></div>
                {r.phone && (
                  <div>
                    <dt className="text-ink-500">Téléphone</dt>
                    <dd className="font-medium text-ink-900">
                      {callAllowed ? <a className="text-pine-700 underline" href={`tel:${r.phone}`}>{formatFrenchPhone(r.phone)}</a> : (
                        <span className="inline-flex items-center gap-1.5 text-ink-500"><PhoneOff className="size-4" aria-hidden />{formatFrenchPhone(r.phone)} (appel non autorisé)</span>
                      )}
                    </dd>
                  </div>
                )}
                {r.email && (
                  <div><dt className="text-ink-500">E-mail</dt><dd className="font-medium"><a className="text-pine-700 underline" href={`mailto:${r.email}`}>{r.email}</a></dd></div>
                )}
                <div><dt className="text-ink-500">Logement</dt><dd className="font-medium text-ink-900">{[r.postalCode, r.communeName].filter(Boolean).join(" ") || "—"} ({r.departement ?? "—"})</dd></div>
                <div><dt className="text-ink-500">Projet</dt><dd className="font-medium text-ink-900">{works || "—"}</dd></div>
                {availability && (availability.days?.length || availability.slots?.length) ? (
                  <div className="sm:col-span-2">
                    <dt className="text-ink-500">Disponibilités</dt>
                    <dd className="font-medium text-ink-900">
                      {[...(availability.days ?? []).map((x) => DAY_LABELS[x]), ...(availability.slots ?? []).map((x) => SLOT_LABELS[x])].join(", ")}
                    </dd>
                  </div>
                ) : null}
                {r.comment && (
                  <div className="sm:col-span-2"><dt className="text-ink-500">Commentaire</dt><dd className="whitespace-pre-line text-ink-900">{r.comment}</dd></div>
                )}
              </dl>
            )}
          </Panel>

          {evaluation ? (
            <Panel title="Résultat présenté au visiteur">
              <p className="mb-1 text-sm font-semibold text-ink-900">{evaluation.headline}</p>
              <p className="mb-4 text-xs text-ink-500">
                Date de référence {evaluation.referenceDate} · barème {evaluation.ruleSetVersion} · moteur {evaluation.engineVersion}
              </p>
              <EvaluationDetails evaluation={evaluation} showNotConcerned />
            </Panel>
          ) : (
            <Panel title="Résultat">
              <p className="text-sm text-ink-600">Demande de rappel rapide : aucun questionnaire complet, aucun résultat de pré-éligibilité n&apos;a été présenté.</p>
            </Panel>
          )}

          <Panel title="Réponses utiles au questionnaire">
            {summary.length === 0 ? <p className="text-sm text-ink-500">—</p> : (
              <dl className="divide-y divide-ink-900/[0.06] text-sm">
                {summary.map((l) => (
                  <div key={`${l.question}-${l.label}`} className="flex justify-between gap-4 py-2">
                    <dt className="text-ink-500">{l.label}</dt>
                    <dd className="text-right font-medium text-ink-900">{l.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          <Panel title="Preuve de la demande de contact">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-ink-500">Horodatage</dt><dd className="font-medium text-ink-900">{dt.format(r.submittedAt)}</dd></div>
              <div><dt className="text-ink-500">Texte exact validé par le visiteur (case cochée)</dt><dd className="rounded-lg bg-sand-100 px-3 py-2 font-medium text-ink-900">« {r.requestSentence} »</dd></div>
              <div>
                <dt className="text-ink-500">Notice d&apos;information affichée (empreinte {r.noticeText.hash.slice(0, 12)}…)</dt>
                <dd>
                  <details className="rounded-lg border border-ink-900/10 px-3 py-2">
                    <summary className="cursor-pointer text-ink-700">Afficher le texte exact</summary>
                    <div className="mt-2 space-y-2 text-xs text-ink-700">{noticeParagraphs(r.noticeText.content).map((p) => <p key={p}>{p}</p>)}</div>
                  </details>
                </dd>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><dt className="text-ink-500">Empreinte IP (HMAC)</dt><dd className="font-mono text-xs text-ink-700">{r.ipHash ? `${r.ipHash.slice(0, 16)}…` : "—"}</dd></div>
                <div><dt className="text-ink-500">Navigateur</dt><dd className="truncate text-xs text-ink-700" title={r.userAgent ?? ""}>{r.userAgent ?? "—"}</dd></div>
              </div>
              <div>
                <dt className="text-ink-500">Source d&apos;acquisition</dt>
                <dd className="text-ink-900">
                  {r.acquisitionOrigin === "NOT_COLLECTED" ? "Non collectée" : r.acquisitionOrigin === "DIRECT" ? "Demande spontanée (sans campagne)" : (
                    <>
                      {r.acquisitionOrigin === "AUTHORIZED_CAMPAIGN" ? "Campagne autorisée" : <span className="font-semibold text-amber-800">Campagne non déclarée — à contrôler</span>} :{" "}
                      {[r.utmSource, r.utmMedium, r.utmCampaign].filter(Boolean).join(" / ")}
                    </>
                  )}
                  {r.landingPath && <span className="text-ink-500"> · arrivée sur {r.landingPath}</span>}
                  {r.referrerHost && <span className="text-ink-500"> · depuis {r.referrerHost}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Notifications internes</dt>
                <dd className="text-ink-700">
                  {r.notifications.length === 0 ? "Aucune (non configurées)" : r.notifications.map((n) => `${n.channel} : ${n.status}${n.lastError ? ` (${n.lastError})` : ""}`).join(" · ")}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Traitement">
            <form action={updateStatusAction} className="flex gap-2">
              <input type="hidden" name="id" value={r.id} />
              <label htmlFor="status" className="sr-only">Statut</label>
              <select id="status" name="status" defaultValue={r.status} className="field-input py-2.5 text-sm">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <SubmitButton variant="dark" className="py-2.5">Enregistrer</SubmitButton>
            </form>
            <form action={assignAction} className="mt-3 flex gap-2">
              <input type="hidden" name="id" value={r.id} />
              {isAdmin ? (
                <>
                  <label htmlFor="assignee" className="sr-only">Assigner à</label>
                  <select id="assignee" name="assigneeId" defaultValue={r.assignedTo?.id ?? ""} className="field-input py-2.5 text-sm">
                    <option value="">Non assignée</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
                  </select>
                  <SubmitButton variant="ghost" className="py-2.5">Assigner</SubmitButton>
                </>
              ) : r.assignedTo?.id === ctx.user.id ? (
                <><input type="hidden" name="assigneeId" value="" /><SubmitButton variant="ghost" className="py-2.5">Me retirer de cette demande</SubmitButton></>
              ) : !r.assignedTo ? (
                <><input type="hidden" name="assigneeId" value={ctx.user.id} /><SubmitButton variant="ghost" className="py-2.5">Prendre en charge</SubmitButton></>
              ) : (
                <p className="text-sm text-ink-600">Assignée à {r.assignedTo.displayName}</p>
              )}
            </form>
            {!r.anonymizedAt && !closed && (
              <form action={logContactAction} className="mt-4 space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <p className="text-sm font-semibold text-ink-900">Enregistrer un contact</p>
                <div className="flex flex-wrap gap-2">
                  {r.channel === "PHONE" && (
                    <>
                      <button name="outcome" value="CALL_NO_ANSWER" disabled={!callAllowed} className="btn-ghost py-2 text-xs">Appel sans réponse</button>
                      <button name="outcome" value="CALL_REACHED" disabled={!callAllowed} className="btn-ghost py-2 text-xs">Appel abouti</button>
                    </>
                  )}
                  {r.email && <button name="outcome" value="EMAIL_SENT" className="btn-ghost py-2 text-xs">E-mail envoyé</button>}
                  <button name="outcome" value="PROSPECT_REPLIED" className="btn-ghost py-2 text-xs">Échange avec la personne</button>
                </div>
              </form>
            )}
          </Panel>

          <Panel title="Notes internes">
            <form action={addNoteAction} className="space-y-2">
              <input type="hidden" name="id" value={r.id} />
              <label htmlFor="note" className="sr-only">Nouvelle note</label>
              <textarea id="note" name="body" rows={3} maxLength={4000} required className="field-input text-sm" placeholder="Note visible uniquement par l'équipe (pas de données sensibles)." />
              <SubmitButton variant="dark" className="py-2.5"><MessageSquare className="size-4" aria-hidden /> Ajouter</SubmitButton>
            </form>
            <ul className="mt-4 space-y-3">
              {r.notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-sand-100 px-3 py-2 text-sm">
                  <p className="whitespace-pre-line text-ink-800">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-500">{n.author?.displayName ?? "Compte supprimé"} · {dts.format(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Historique">
            <ol className="space-y-3 border-l-2 border-ink-900/10 pl-4">
              {r.events.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="font-medium text-ink-900">{EVENT_LABELS[e.type] ?? e.type}{eventDetail(e.type, e.data) ? ` — ${eventDetail(e.type, e.data)}` : ""}</p>
                  <p className="text-xs text-ink-500">{dts.format(e.createdAt)} · {e.actor?.displayName ?? "Système / visiteur"}</p>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Données et droits">
            <div className="space-y-3">
              {!closed && !r.anonymizedAt && (
                <form action={recordOppositionAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <SubmitButton variant="ghost" className="w-full" confirm="Enregistrer l'opposition de la personne et clore la demande ?">
                    <ShieldBan className="size-4" aria-hidden /> La personne s&apos;oppose à être contactée
                  </SubmitButton>
                </form>
              )}
              {isAdmin && !r.anonymizedAt && (
                <form action={anonymizeAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <SubmitButton variant="ghost" className="w-full" confirm="Anonymiser définitivement cette demande (coordonnées, commentaire et notes effacés) ?">
                    Anonymiser maintenant
                  </SubmitButton>
                </form>
              )}
              {isAdmin && (
                <form action={deleteAction} className="space-y-2 rounded-xl border border-red-200 p-3">
                  <input type="hidden" name="id" value={r.id} />
                  <label htmlFor="confirmReference" className="block text-xs text-red-800">
                    Suppression définitive (y compris la preuve) : saisissez la référence <span className="font-mono">{r.reference}</span>
                  </label>
                  <input id="confirmReference" name="confirmReference" className="field-input py-2 text-sm" autoComplete="off" />
                  <SubmitButton variant="danger" className="w-full py-2.5">
                    <CircleAlert className="size-4" aria-hidden /> Supprimer la demande
                  </SubmitButton>
                </form>
              )}
              {!isAdmin && <p className="text-xs text-ink-500">L&apos;anonymisation et la suppression sont réservées aux administrateurs.</p>}
              <p className="flex items-center gap-1.5 text-xs text-ink-500"><Mail className="size-3.5" aria-hidden /> Chaque consultation de cette fiche est journalisée.</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
