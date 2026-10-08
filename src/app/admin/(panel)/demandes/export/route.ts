import { DISPOSITIF_INFO, WORK_CATEGORY_LABELS } from "@/engine";
import type { DispositifStatus, Evaluation, WorkCategory } from "@/engine/types";
import { aidName, APPOINTMENT_MODES, type AppointmentMode, type StoredQualification } from "@/lib/admin/qualification";
import { buildRequestWhere, parisYear, parseListFilters, resolvePartnerFilter } from "@/lib/admin/requests";
import { audit } from "@/lib/audit";
import { canExport, requireStaff } from "@/lib/auth/guards";
import { type CsvColumn, toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { WORK_ITEMS } from "@/engine/works";
import { matchPartner } from "@/lib/leads/partners";
import { leadLabels, leadProfileFromRow } from "@/lib/leads/profile";
import { rateLimit } from "@/lib/ratelimit";
import { requestContext } from "@/lib/request-context";
import { CHANNEL_LONG_LABELS, KIND_LABELS, OUTCOME_LABELS, STATUS_LABELS } from "@/lib/requests/shared";

const paris = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
const fmt = (d: Date | null) => (d ? paris.format(d) : "");
/** Aides d'un statut donné dans le résultat enregistré avec la demande. */
const aidsWith = (evaluation: unknown, status: DispositifStatus) =>
  ((evaluation as Evaluation | null)?.results ?? [])
    .filter((x) => x.status === status)
    .map((x) => DISPOSITIF_INFO[x.id].name)
    .join(", ");

/** Export CSV réservé aux personnes autorisées ; chaque export est journalisé. */
export async function GET(request: Request) {
  const ctx = await requireStaff();
  const { ip } = await requestContext();
  if (!canExport(ctx.user)) {
    await audit({ actor: ctx.user, action: "ACCESS_DENIED", targetType: "EXPORT", ip });
    return new Response("Export non autorisé.", { status: 403 });
  }
  const rl = await rateLimit("export", ctx.user.id, 20, 3600);
  if (!rl.allowed) return new Response("Trop d'exports. Réessayez plus tard.", { status: 429 });

  // Mêmes filtres que la liste, y compris l'entreprise partenaire (ignorée si inconnue ou désactivée).
  const { filters, partner } = await resolvePartnerFilter(parseListFilters(Object.fromEntries(new URL(request.url).searchParams)));
  const now = new Date();
  const rows = await prisma.contactRequest.findMany({
    where: buildRequestWhere(filters, ctx.user, ctx.settings, now, partner?.criteria),
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: { assignedTo: { select: { displayName: true } } },
  });
  const year = parisYear(now);
  const lines = rows.map((r) => ({ ...r, profile: leadProfileFromRow(r) }));
  // Filtre « partenaire » : correspondance de chaque demande avec les critères de l'entreprise, comme dans la liste.
  const partnerColumns: CsvColumn<(typeof lines)[number]>[] = partner
    ? [
        {
          header: `Critères ${partner.name}`,
          value: (r) => {
            const m = matchPartner(r.profile, partner.criteria, year);
            const open = m.checks.filter((c) => c.status !== "OK").map((c) => c.label);
            const label = m.status === "MATCH" ? "Correspond" : m.status === "TO_CHECK" ? "À vérifier" : "Ne correspond pas";
            return open.length ? `${label} (${open.join(", ")})` : label;
          },
        },
      ]
    : [];
  const csv = toCsv(lines, [
    { header: "Référence", value: (r) => r.reference },
    { header: "Date", value: (r) => fmt(r.createdAt) },
    { header: "Type", value: (r) => KIND_LABELS[r.kind] },
    { header: "Statut", value: (r) => STATUS_LABELS[r.status] },
    { header: "Résultat indicatif", value: (r) => OUTCOME_LABELS[r.overallOutcome] },
    { header: "Aides potentiellement éligibles", value: (r) => aidsWith(r.evaluation, "POTENTIALLY_ELIGIBLE") },
    { header: "Aides à vérifier", value: (r) => aidsWith(r.evaluation, "NEEDS_REVIEW") },
    { header: "Canal demandé", value: (r) => CHANNEL_LONG_LABELS[r.channel] },
    { header: "Prénom", value: (r) => r.firstName },
    { header: "Nom", value: (r) => r.lastName },
    { header: "Téléphone", value: (r) => r.phone },
    { header: "E-mail", value: (r) => r.email },
    { header: "Adresse", value: (r) => r.streetAddress },
    { header: "Code postal", value: (r) => r.postalCode },
    { header: "Commune", value: (r) => r.communeName },
    { header: "Département", value: (r) => r.departement },
    { header: "Travaux", value: (r) => r.projectTypes.map((p) => WORK_CATEGORY_LABELS[p as WorkCategory] ?? p).join(", ") },
    { header: "Travaux précis", value: (r) => r.profile.workItems.map((w) => WORK_ITEMS[w]?.label ?? w).join(", ") },
    { header: "Catégorie de revenus", value: (r) => leadLabels.income(r.profile.incomeCategory) },
    { header: "Personnes au foyer", value: (r) => r.profile.householdSize },
    { header: "Logement", value: (r) => leadLabels.housingType(r.profile.housingType) },
    // « Statut » désigne déjà le statut de traitement : intitulé de la fiche partenaire.
    { header: "Propriétaire ou locataire", value: (r) => leadLabels.occupancy(r.profile.occupancy) },
    { header: "Chauffage actuel", value: (r) => leadLabels.currentHeating(r.profile.currentHeating) },
    { header: "Diffusion de la chaleur", value: (r) => leadLabels.heatEmitters(r.profile.heatEmitters) },
    { header: "Radiateurs", value: (r) => r.profile.radiatorCount },
    { header: "Surface chauffée (m²)", value: (r) => r.profile.heatedArea },
    { header: "Emplacement chaudière", value: (r) => leadLabels.boilerLocation(r.profile.boilerLocation) },
    { header: "Construction", value: (r) => leadLabels.construction(r.profile.constructionYearMin, r.profile.constructionYearMax) },
    ...partnerColumns,
    { header: "Entreprise nommée dans la demande", value: (r) => r.requestedPartnerName },
    { header: "Demande transmise à l'entreprise nommée le", value: (r) => fmt(r.requestedPartnerSentAt) },
    { header: "Assigné à", value: (r) => r.assignedTo?.displayName },
    { header: "Échéance de rappel", value: (r) => fmt(r.callbackDeadline) },
    { header: "Premier contact", value: (r) => fmt(r.firstContactAt) },
    { header: "Rendez-vous", value: (r) => fmt(r.appointmentAt) },
    { header: "Mode du rendez-vous", value: (r) => (r.appointmentMode ? (APPOINTMENT_MODES[r.appointmentMode as AppointmentMode] ?? r.appointmentMode) : "") },
    { header: "Entreprise du rendez-vous", value: (r) => r.appointmentPartner },
    { header: "Accord de transmission", value: (r) => fmt(r.partnerConsentAt) },
    { header: "Rendez-vous transmis le", value: (r) => fmt(r.partnerSentAt) },
    {
      header: "Aides qualifiées",
      value: (r) => ((r.qualification as unknown as StoredQualification | null)?.aids ?? []).map((a) => aidName(a)).join(", "),
    },
    { header: "Commentaire", value: (r) => r.comment },
    { header: "Origine", value: (r) => r.acquisitionOrigin },
    { header: "utm_source", value: (r) => r.utmSource },
    { header: "utm_medium", value: (r) => r.utmMedium },
    { header: "utm_campaign", value: (r) => r.utmCampaign },
    { header: "Version du barème", value: (r) => r.ruleSetVersion },
    { header: "Version du moteur", value: (r) => r.engineVersion },
    { header: "Démonstration", value: (r) => (r.isDemo ? "oui" : "") },
  ]);
  await audit({
    actor: ctx.user,
    action: "EXPORT_CSV",
    targetType: "ContactRequest",
    ip,
    metadata: { count: rows.length, filters: JSON.parse(JSON.stringify(filters)) },
  });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="demandes-${day}.csv"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
