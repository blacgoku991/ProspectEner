import "server-only";
import { z } from "zod";
import type { Prisma, StaffUser } from "@/generated/prisma/client";
import { isWithinRecommendedCallWindow, joursOuvrablesRestants } from "../business-days";
import type { SiteSettings } from "../settings-schema";
import { requestScope } from "../auth/guards";

export const OPEN_STATUSES = ["NOUVEAU", "A_VERIFIER", "CONTACTE", "RDV_FIXE", "ETUDE_EN_COURS"] as const;
const STATUSES = ["NOUVEAU", "A_VERIFIER", "CONTACTE", "RDV_FIXE", "ETUDE_EN_COURS", "TERMINE", "SANS_SUITE", "CONTACT_ANNULE"] as const;
const OUTCOMES = ["POTENTIALLY_ELIGIBLE", "NEEDS_REVIEW", "NOT_ELIGIBLE", "OUT_OF_SCOPE", "NOT_EVALUATED"] as const;
const WORKS = ["ISOLATION", "CHAUFFAGE", "PAC", "EAU_CHAUDE", "VENTILATION", "RENOVATION_GLOBALE", "AUTRE"] as const;

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

export function buildRequestWhere(f: ListFilters, user: Pick<StaffUser, "id" | "role">, settings: SiteSettings, now = new Date()): Prisma.ContactRequestWhereInput {
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
