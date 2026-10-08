import { z } from "zod";
import { APPOINTMENT_MODES, type AppointmentMode } from "@/lib/admin/qualification";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guards";
import { parisToday } from "@/lib/business-days";
import { type CsvColumn, toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { LEAD_FIELD_COLUMNS, leadContactFields, leadProfileFields } from "@/lib/leads/fields";
import { getPartner, partnerDisplayName } from "@/lib/leads/partners-db";
import { exportRequestedLeads, USAGE_TERMS, USAGE_TERMS_HEADER } from "@/lib/leads/requested-partner";
import { LEAD_PROFILE_SELECT, leadProfileFromRow } from "@/lib/leads/profile";
import { rateLimit } from "@/lib/ratelimit";
import { requestContext } from "@/lib/request-context";
import { transmittedWhere } from "../../queries";
import { partnerFileSlug } from "../../slug";

const paris = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
const fmt = (d: Date | null) => (d ? paris.format(d) : "");

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
 * Exports CSV d'une entreprise partenaire, réservés aux administrateurs (comme toute la rubrique
 * Partenaires) ; chaque export est journalisé (nombre de lignes seulement). Ces téléchargements ne
 * modifient rien : la transmission des nouvelles demandes se confirme sur la fiche de l'entreprise.
 * - par défaut : rendez-vous confiés à l'entreprise, avec l'accord de chaque personne ;
 * - `?type=demandes` : demandes déjà transmises à l'entreprise qui les nomme, toujours transmissibles
 *   (nouveau téléchargement d'un fichier perdu).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  const { ip } = await requestContext();
  const { id } = await params;
  const partner = z.uuid().safeParse(id).success ? await getPartner(id) : null;
  if (!partner) return new Response("Entreprise introuvable.", { status: 404 });

  const search = new URL(request.url).searchParams;
  // Ancien lien « demandes à transmettre » : la transmission se confirme désormais sur la fiche.
  if (search.get("type") === "demandes" && search.get("nouvelles") === "1") {
    return new Response(null, { status: 303, headers: { location: `/admin/partenaires/${partner.id}#transmettre` } });
  }

  const rl = await rateLimit("partner-export", ctx.user.id, 20, 3600);
  if (!rl.allowed) return new Response("Trop d'exports. Réessayez plus tard.", { status: 429 });

  if (search.get("type") === "demandes") {
    const result = await exportRequestedLeads({ partner });
    // Métadonnées techniques uniquement : nombre de lignes, jamais de coordonnées.
    await audit({
      actor: ctx.user,
      action: "EXPORT_CSV",
      targetType: "Partner",
      targetId: partner.id,
      ip,
      metadata: { type: "demandes", op: "redownload", partner: partnerDisplayName(partner), count: result.count },
    });
    return csvResponse(result.csv, `demandes-transmises-${partnerFileSlug(partner.name)}-${parisToday()}.csv`);
  }

  const rows = await prisma.contactRequest.findMany({
    where: transmittedWhere(partner),
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
    { header: USAGE_TERMS_HEADER, value: () => USAGE_TERMS.APPOINTMENT },
  ];
  const csv = toCsv(lines, columns);

  // Métadonnées techniques uniquement : nombre de lignes, jamais de coordonnées.
  await audit({
    actor: ctx.user,
    action: "EXPORT_CSV",
    targetType: "Partner",
    targetId: partner.id,
    ip,
    metadata: { type: "rendez-vous", partner: partnerDisplayName(partner), count: rows.length },
  });
  return csvResponse(csv, `partenaire-${partnerFileSlug(partner.name)}-${parisToday()}.csv`);
}
