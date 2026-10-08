import { z } from "zod";
import { APPOINTMENT_MODES, type AppointmentMode } from "@/lib/admin/qualification";
import { audit } from "@/lib/audit";
import { canExport, requestScope, requireStaff } from "@/lib/auth/guards";
import { parisToday } from "@/lib/business-days";
import { type CsvColumn, toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { LEAD_FIELD_COLUMNS, leadContactFields, leadProfileFields } from "@/lib/leads/fields";
import { getPartner } from "@/lib/leads/partners-db";
import { exportRequestedLeads } from "@/lib/leads/requested-partner";
import { LEAD_PROFILE_SELECT, leadProfileFromRow } from "@/lib/leads/profile";
import { rateLimit } from "@/lib/ratelimit";
import { requestContext } from "@/lib/request-context";
import { transmittedWhere } from "../../queries";

const paris = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
const fmt = (d: Date | null) => (d ? paris.format(d) : "");

/** Nom de fichier sans accents ni caractères spéciaux. */
const slug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "entreprise";

const csvResponse = (csv: string, filename: string) =>
  new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

/**
 * Exports CSV d'une entreprise partenaire, réservés aux personnes autorisées à exporter, limités à
 * leur périmètre ; chaque export est journalisé (nombre de lignes seulement).
 * - par défaut : rendez-vous confiés à l'entreprise, avec l'accord de chaque personne ;
 * - `?type=demandes` : demandes qui nomment l'entreprise (`&nouvelles=1` : seulement celles pas encore
 *   transmises) ; leur première transmission est enregistrée sur la demande et dans son historique.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff();
  const { ip } = await requestContext();
  if (!canExport(ctx.user)) {
    await audit({ actor: ctx.user, action: "ACCESS_DENIED", targetType: "EXPORT", ip });
    return new Response("Export non autorisé.", { status: 403 });
  }
  const { id } = await params;
  const partner = z.uuid().safeParse(id).success ? await getPartner(id) : null;
  if (!partner) return new Response("Entreprise introuvable.", { status: 404 });

  const rl = await rateLimit("partner-export", ctx.user.id, 20, 3600);
  if (!rl.allowed) return new Response("Trop d'exports. Réessayez plus tard.", { status: 429 });

  const search = new URL(request.url).searchParams;
  if (search.get("type") === "demandes") {
    const pendingOnly = search.get("nouvelles") === "1";
    const result = await exportRequestedLeads({ partner, scope: requestScope(ctx.user, ctx.settings), pendingOnly, actorId: ctx.user.id });
    // Métadonnées techniques uniquement : nombres de lignes, jamais de coordonnées.
    await audit({
      actor: ctx.user,
      action: "EXPORT_CSV",
      targetType: "Partner",
      targetId: partner.id,
      ip,
      metadata: { type: "demandes", pendingOnly, count: result.count, newlySent: result.newlySent },
    });
    return csvResponse(result.csv, `demandes-${slug(partner.name)}-${parisToday()}.csv`);
  }

  const rows = await prisma.contactRequest.findMany({
    where: { AND: [requestScope(ctx.user, ctx.settings), transmittedWhere(partner)] },
    orderBy: [{ appointmentAt: "asc" }, { createdAt: "asc" }],
    take: 10_000,
    select: {
      reference: true,
      createdAt: true,
      appointmentAt: true,
      appointmentMode: true,
      partnerConsentAt: true,
      firstName: true,
      lastName: true,
      streetAddress: true,
      postalCode: true,
      communeName: true,
      phone: true,
      email: true,
      ...LEAD_PROFILE_SELECT,
    },
  });
  const lines = rows.map((r) => {
    const fields = [...leadContactFields(r), ...leadProfileFields(leadProfileFromRow(r))];
    return { r, values: new Map(fields.map((f) => [f.key, f.value])) };
  });
  type Line = (typeof lines)[number];
  const columns: CsvColumn<Line>[] = [
    { header: "Référence", value: ({ r }) => r.reference },
    { header: "Date de la demande", value: ({ r }) => fmt(r.createdAt) },
    { header: "Rendez-vous", value: ({ r }) => fmt(r.appointmentAt) },
    { header: "Mode du rendez-vous", value: ({ r }) => (r.appointmentMode ? (APPOINTMENT_MODES[r.appointmentMode as AppointmentMode] ?? r.appointmentMode) : "") },
    ...LEAD_FIELD_COLUMNS.map((f): CsvColumn<Line> => ({ header: f.label, value: ({ values }) => values.get(f.key) ?? "" })),
    { header: "Accord de la personne le", value: ({ r }) => fmt(r.partnerConsentAt) },
  ];
  const csv = toCsv(lines, columns);

  // Métadonnées techniques uniquement : nombre de lignes, jamais de coordonnées.
  await audit({ actor: ctx.user, action: "EXPORT_CSV", targetType: "Partner", targetId: partner.id, ip, metadata: { count: rows.length } });
  return csvResponse(csv, `partenaire-${slug(partner.name)}-${parisToday()}.csv`);
}
