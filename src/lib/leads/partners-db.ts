import "server-only";
import { prisma } from "../db";
import { criteriaNeedReview, type PartnerCriteria, parsePartnerCriteria, type RequestPartnerCandidate } from "./partners";

export interface PartnerRecord {
  id: string;
  name: string;
  details: string | null;
  active: boolean;
  criteria: PartnerCriteria;
  createdAt: Date;
  updatedAt: Date;
}

/** Entreprises partenaires, actives d'abord, par ordre alphabétique. */
export async function listPartners(opts: { activeOnly?: boolean } = {}): Promise<PartnerRecord[]> {
  const rows = await prisma.partner.findMany({
    where: opts.activeOnly ? { active: true } : undefined,
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return rows.map((r) => ({ ...r, criteria: parsePartnerCriteria(r.criteria) }));
}

export async function getPartner(id: string): Promise<PartnerRecord | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const r = await prisma.partner.findUnique({ where: { id } });
  return r ? { ...r, criteria: parsePartnerCriteria(r.criteria) } : null;
}

/** Libellé public d'une entreprise : dénomination, puis précisions (ville, RGE…). */
export function partnerDisplayName(p: { name: string; details: string | null }): string {
  return p.details ? `${p.name}, ${p.details}` : p.name;
}

/** Comparaison des noms d'entreprise : casse et espaces ignorés. */
export function samePartnerName(a: string, b: string): boolean {
  const norm = (v: string) => v.replace(/\s+/g, " ").trim().toLocaleLowerCase("fr");
  return norm(a) === norm(b);
}

/**
 * Entreprises qui peuvent être nommées dans une demande (configuration publique et contrôle du
 * serveur) : entreprises actives dont les critères sont lisibles, réduites à l'identifiant, au nom
 * affiché et aux critères. Une entreprise aux critères à revoir n'est jamais nommée.
 */
export function requestPartnerCandidates(partners: PartnerRecord[]): RequestPartnerCandidate[] {
  return partners
    .filter((p) => p.active && !criteriaNeedReview(p.criteria))
    .map((p) => ({ id: p.id, displayName: partnerDisplayName(p), criteria: p.criteria }));
}

export async function countActivePartners(): Promise<number> {
  return prisma.partner.count({ where: { active: true } });
}
