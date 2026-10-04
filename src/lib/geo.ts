import "server-only";
import { COMMUNES_DATA } from "@/data/communes";

export interface CommuneOption {
  insee: string;
  name: string;
  departement: string;
}

let index: Map<string, CommuneOption[]> | null = null;

function load(): Map<string, CommuneOption[]> {
  if (index) return index;
  const map = new Map<string, CommuneOption[]>();
  for (const line of COMMUNES_DATA.split("\n")) {
    const [cp, insee, name, departement] = line.split(";");
    if (!cp || !insee || !name || !departement) continue;
    const list = map.get(cp) ?? [];
    list.push({ insee, name, departement });
    map.set(cp, list);
  }
  index = map;
  return map;
}

/** Communes correspondant à un code postal (jeu de données officiel embarqué, sans appel externe). */
export function communesForPostalCode(postalCode: string): CommuneOption[] {
  if (!/^\d{5}$/.test(postalCode)) return [];
  return load().get(postalCode) ?? [];
}
