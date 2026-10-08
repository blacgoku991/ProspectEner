import "server-only";
import { z } from "zod";
import type { Prisma, StaffUser } from "@/generated/prisma/client";
import { isWithinRecommendedCallWindow, joursOuvrablesRestants, parisParts } from "../business-days";
import type { SiteSettings } from "../settings-schema";
import { requestScope } from "../auth/guards";
import { type PartnerCriteria, partnerWhere } from "../leads/partners";
import { getPartner, type PartnerRecord } from "../leads/partners-db";
import { type LeadProfile, leadLabels } from "../leads/profile";

export const OPEN_STATUSES = ["NOUVEAU", "A_VERIFIER", "CONTACTE", "RDV_FIXE", "ETUDE_EN_COURS"] as const;
const STATUSES = ["NOUVEAU", "A_VERIFIER", "CONTACTE", "RDV_FIXE", "ETUDE_EN_COURS", "TERMINE", "SANS_SUITE", "CONTACT_ANNULE"] as const;
const OUTCOMES = ["POTENTIALLY_ELIGIBLE", "NEEDS_REVIEW", "NOT_ELIGIBLE", "OUT_OF_SCOPE", "NOT_EVALUATED"] as const;
const WORKS = ["ISOLATION", "CHAUFFAGE", "PAC", "EAU_CHAUDE", "VENTILATION", "RENOVATION_GLOBALE", "AUTRE"] as const;
/** Catégories de revenus (bleu, jaune, violet, rose) ; INCONNU = réponse inconnue ou question non posée. */
export const INCOME_FILTERS = ["TRES_MODESTE", "MODESTE", "INTERMEDIAIRE", "SUPERIEUR", "INCONNU"] as const;

/** Filtres de la liste des demandes (lus depuis l'URL, bornés et validés). */
export const listFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  status: z.enum(STATUSES).optional().catch(undefined),
  open: z.enum(["1"]).optional().catch(undefined),
  demo: z.enum(["1"]).optional().catch(undefined),
  outcome: z.enum(OUTCOMES).optional().catch(undefined),
  kind: z.enum(["SIMULATION", "QUICK_CALLBACK"]).optional().catch(undefined),
  channel: z.enum(["PHONE", "EMAIL"]).optional().catch(undefined),
  territory: z.enum(["IDF", "METRO", "DROM", "COM", "HORS_FRANCE", "INCONNU"]).optional().catch(undefined),
  work: z.enum(WORKS).optional().catch(undefined),
  revenus: z.enum(INCOME_FILTERS).optional().catch(undefined),
  /** Entreprise partenaire : demandes qui la nomment, qui correspondent à ses critères, ou à vérifier. */
  partenaire: z.uuid().optional().catch(undefined),
  /** Avec « partenaire » : seulement les demandes qui nomment l'entreprise (phrase validée avant l'envoi). */
  nommee: z.enum(["1"]).optional().catch(undefined),
  assigned: z.string().regex(/^(me|none|[0-9a-f-]{36})$/).optional().catch(undefined),
  deadline: z.enum(["soon", "overdue"]).optional().catch(undefined),
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  sort: z.enum(["recent", "oldest", "deadline", "status"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});

export type ListFilters = z.infer<typeof listFiltersSchema>;

export function parseListFilters(sp: Record<string, string | string[] | undefined>): ListFilters {
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return listFiltersSchema.parse(flat);
}

/**
 * Entreprise du filtre « partenaire », lue en base (les critères ne sont pas dans l'URL).
 * Une entreprise inconnue ou désactivée est ignorée : le filtre est retiré des filtres retournés,
 * pour que la pagination et l'export ne le reprennent pas. `activePartners` : liste déjà chargée,
 * pour éviter une seconde lecture.
 */
export async function resolvePartnerFilter(
  f: ListFilters,
  activePartners?: PartnerRecord[],
): Promise<{ filters: ListFilters; partner: PartnerRecord | null }> {
  if (!f.partenaire) return { filters: { ...f, nommee: undefined }, partner: null };
  const partner = activePartners ? (activePartners.find((p) => p.id === f.partenaire) ?? null) : await getPartner(f.partenaire);
  if (!partner?.active) return { filters: { ...f, partenaire: undefined, nommee: undefined }, partner: null };
  return { filters: f, partner };
}

/** Année en cours à Paris : référence de l'ancienneté du logement dans les critères des entreprises. */
export const parisYear = (now = new Date()) => parisParts(now).year;

/**
 * Filtre Prisma de la liste. `partnerCriteria` : critères de l'entreprise du filtre « partenaire »
 * (voir resolvePartnerFilter) ; les demandes anonymisées sont alors écartées, comme dans les
 * compteurs de la page Partenaires.
 */
export function buildRequestWhere(
  f: ListFilters,
  user: Pick<StaffUser, "id" | "role">,
  settings: SiteSettings,
  now = new Date(),
  partnerCriteria?: PartnerCriteria | null,
): Prisma.ContactRequestWhereInput {
  const and: Prisma.ContactRequestWhereInput[] = [requestScope(user, settings)];
  if (f.q) {
    const q = f.q;
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { reference: { contains: q.toUpperCase() } },
        { lastName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { email: { contains: q.toLowerCase() } },
        { communeName: { contains: q, mode: "insensitive" } },
        { streetAddress: { contains: q, mode: "insensitive" } },
        { postalCode: { startsWith: q } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
      ],
    });
  }
  if (f.status) and.push({ status: f.status });
  if (f.open) and.push({ status: { in: [...OPEN_STATUSES] } });
  if (f.demo) and.push({ isDemo: true });
  if (f.outcome) and.push({ overallOutcome: f.outcome });
  if (f.kind) and.push({ kind: f.kind });
  if (f.channel) and.push({ channel: f.channel });
  if (f.territory) and.push({ territory: f.territory });
  if (f.work) and.push({ projectTypes: { has: f.work } });
  if (f.revenus) and.push({ incomeCategory: f.revenus === "INCONNU" ? null : f.revenus });
  if (f.partenaire && partnerCriteria) {
    const named: Prisma.ContactRequestWhereInput = { requestedPartnerId: f.partenaire };
    and.push(f.nommee ? named : { OR: [named, partnerWhere(partnerCriteria, parisYear(now))] }, { anonymizedAt: null });
  }
  if (f.assigned === "me") and.push({ assignedToId: user.id });
  else if (f.assigned === "none") and.push({ assignedToId: null });
  else if (f.assigned) and.push({ assignedToId: f.assigned });
  if (f.deadline) {
    const pending: Prisma.ContactRequestWhereInput = {
      channel: "PHONE",
      firstContactAt: null,
      status: { in: ["NOUVEAU", "A_VERIFIER"] },
    };
    and.push(
      f.deadline === "overdue"
        ? { ...pending, callbackDeadline: { lt: now } }
        : { ...pending, callbackDeadline: { gte: now, lte: new Date(now.getTime() + 2 * 24 * 3600 * 1000) } },
    );
  }
  if (f.from) and.push({ createdAt: { gte: new Date(`${f.from}T00:00:00Z`) } });
  if (f.to) and.push({ createdAt: { lte: new Date(`${f.to}T23:59:59Z`) } });
  return { AND: and };
}

export function orderByFor(sort: ListFilters["sort"]): Prisma.ContactRequestOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }];
    case "deadline":
      return [{ callbackDeadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "status":
      return [{ status: "asc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

// ─── Résumé de l'installation (liste des demandes) ───────────────────────────

const HEATING_SHORT: Record<string, string> = {
  CHAUDIERE_GAZ: "Gaz",
  CHAUDIERE_FIOUL: "Fioul",
  CHAUDIERE_CHARBON: "Charbon",
  ELECTRIQUE: "Électrique",
  BOIS: "Bois",
  PAC: "Pompe à chaleur",
  RESEAU_CHALEUR: "Réseau de chaleur",
  AUTRE: "Autre chauffage",
};

const EMITTER_SHORT: Record<string, string> = {
  RADIATEURS_FONTE: "radiateurs fonte",
  RADIATEURS_ACIER_ALU: "radiateurs acier/alu",
  PLANCHER_CHAUFFANT_EAU: "plancher chauffant à eau",
  RADIATEURS_ELECTRIQUES: "radiateurs électriques",
  POELE_CHEMINEE: "poêle ou cheminée",
  AUTRE: "autres émetteurs",
};

/**
 * Ligne courte de qualification, par ex. « Fioul · radiateurs fonte (9) · 120 m² · Maison ».
 * null si aucune de ces réponses n'est connue.
 */
export function installationSummary(p: Pick<LeadProfile, "currentHeating" | "heatEmitters" | "radiatorCount" | "heatedArea" | "housingType">): string | null {
  const emitters = p.heatEmitters ? (EMITTER_SHORT[p.heatEmitters] ?? leadLabels.heatEmitters(p.heatEmitters)) : null;
  const radiators =
    p.radiatorCount === null ? null : emitters ? `(${p.radiatorCount})` : `${p.radiatorCount} radiateur${p.radiatorCount > 1 ? "s" : ""}`;
  const parts = [
    p.currentHeating ? (HEATING_SHORT[p.currentHeating] ?? leadLabels.currentHeating(p.currentHeating)) : null,
    [emitters, radiators].filter(Boolean).join(" ") || null,
    p.heatedArea === null ? null : `${p.heatedArea} m²`,
    leadLabels.housingType(p.housingType),
  ].filter((x): x is string => Boolean(x));
  if (parts.length === 0) return null;
  const line = parts.join(" · ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

export type CallbackState = "NONE" | "IN_WINDOW" | "SOON" | "OVERDUE" | "CONTACTED" | "CLOSED";

/** État de la demande de rappel au regard du délai de réponse (art. R223-4). */
export function callbackState(
  r: { channel: string; callbackDeadline: Date | null; firstContactAt: Date | null; status: string },
  settings: SiteSettings,
  now = new Date(),
): { state: CallbackState; remaining: number | null; callWindow: boolean } {
  const opts = { alsaceMoselle: settings.contact.alsaceMoselleHolidays };
  const callWindow = isWithinRecommendedCallWindow(now, opts);
  if (r.channel !== "PHONE" || !r.callbackDeadline) return { state: "NONE", remaining: null, callWindow };
  if (["TERMINE", "SANS_SUITE", "CONTACT_ANNULE"].includes(r.status)) return { state: "CLOSED", remaining: null, callWindow };
  if (r.firstContactAt) return { state: "CONTACTED", remaining: null, callWindow };
  if (now.getTime() > r.callbackDeadline.getTime()) return { state: "OVERDUE", remaining: 0, callWindow };
  const remaining = joursOuvrablesRestants(now, r.callbackDeadline, opts);
  return { state: remaining <= 1 ? "SOON" : "IN_WINDOW", remaining, callWindow };
}
