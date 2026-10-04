import { DISPOSITIF_INFO, WORK_CATEGORY_LABELS } from "@/engine";
import type { DispositifStatus, Evaluation, WorkCategory } from "@/engine/types";
import { aidName, APPOINTMENT_MODES, type AppointmentMode, type StoredQualification } from "@/lib/admin/qualification";
import { buildRequestWhere, parseListFilters } from "@/lib/admin/requests";
import { audit } from "@/lib/audit";
import { canExport, requireStaff } from "@/lib/auth/guards";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
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

  const filters = parseListFilters(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await prisma.contactRequest.findMany({
    where: buildRequestWhere(filters, ctx.user, ctx.settings),
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: { assignedTo: { select: { displayName: true } } },
  });
  const csv = toCsv(rows, [
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
    { header: "Code postal", value: (r) => r.postalCode },
    { header: "Commune", value: (r) => r.communeName },
    { header: "Département", value: (r) => r.departement },
    { header: "Travaux", value: (r) => r.projectTypes.map((p) => WORK_CATEGORY_LABELS[p as WorkCategory] ?? p).join(", ") },
    { header: "Assigné à", value: (r) => r.assignedTo?.displayName },
    { header: "Échéance de rappel", value: (r) => fmt(r.callbackDeadline) },
    { header: "Premier contact", value: (r) => fmt(r.firstContactAt) },
    { header: "Rendez-vous", value: (r) => fmt(r.appointmentAt) },
    { header: "Mode du rendez-vous", value: (r) => (r.appointmentMode ? (APPOINTMENT_MODES[r.appointmentMode as AppointmentMode] ?? r.appointmentMode) : "") },
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
