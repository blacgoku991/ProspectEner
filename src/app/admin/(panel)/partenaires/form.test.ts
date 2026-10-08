import { describe, expect, it } from "vitest";
import { HYDRAULIC_HEAT_PUMP_PRESET, partnerCriteriaSchema } from "@/lib/leads/partners";
import { formValuesFrom, MULTI_FIELDS, type PartnerFormValues, parseDepartements, parsePartnerForm } from "./form";

/** FormData tel qu'envoyé par le formulaire (cases cochées répétées sous le même nom). */
function formData(values: Partial<PartnerFormValues>): FormData {
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((v) => f.append(key, v));
    else if (typeof value === "boolean") {
      if (value) f.append(key, "on");
    } else if (value !== undefined) f.append(key, value);
  }
  return f;
}

const parse = (values: Partial<PartnerFormValues>) => parsePartnerForm(formData({ name: "Chauffage Durand", ...values }));

describe("formulaire d'une entreprise partenaire", () => {
  it("lit l'identité et les critères cochés", () => {
    const r = parse({
      name: "  Chauffage   Durand ",
      details: " Lille,  RGE QualiPAC ",
      active: true,
      works: ["PAC_AIR_EAU", "PAC_AIR_EAU"],
      incomeCategories: ["TRES_MODESTE", "MODESTE"],
      housingTypes: ["MAISON"],
      heatEmitters: ["RADIATEURS_FONTE", "RADIATEURS_ACIER_ALU"],
      minHeatedArea: "80",
      minBuildingAge: "",
      departements: "59, 62;2a 1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toEqual({
      name: "Chauffage Durand",
      details: "Lille, RGE QualiPAC",
      active: true,
      criteria: {
        works: ["PAC_AIR_EAU"],
        incomeCategories: ["TRES_MODESTE", "MODESTE"],
        housingTypes: ["MAISON"],
        occupancies: [],
        currentHeating: [],
        heatEmitters: ["RADIATEURS_FONTE", "RADIATEURS_ACIER_ALU"],
        minHeatedArea: 80,
        minBuildingAge: null,
        departements: ["59", "62", "2A", "01"],
      },
    });
    expect(r.values.departements).toBe("59, 62, 2A, 01");
  });

  it("sans critère : aucun filtre, entreprise inactive si la case n'est pas cochée", () => {
    const r = parse({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.active).toBe(false);
    expect(r.data.details).toBeNull();
    expect(r.data.criteria).toEqual(partnerCriteriaSchema.parse({}));
  });

  it("refuse une saisie invalide en conservant ce qui a été saisi", () => {
    const missing = parse({ name: " ", works: ["PAC_AIR_EAU"] });
    expect(missing).toMatchObject({ ok: false, error: "Indiquez la dénomination de l'entreprise." });
    expect(missing.values.works).toEqual(["PAC_AIR_EAU"]);

    expect(parse({ name: "x".repeat(121) })).toMatchObject({ ok: false });
    expect(parse({ details: "x".repeat(201) })).toMatchObject({ ok: false });
    expect(parse({ minHeatedArea: "0" })).toMatchObject({ ok: false, error: expect.stringContaining("Surface chauffée minimale") });
    expect(parse({ minHeatedArea: "80.5" })).toMatchObject({ ok: false });
    expect(parse({ minBuildingAge: "101" })).toMatchObject({ ok: false, error: expect.stringContaining("Ancienneté minimale") });
    expect(parse({ works: ["PISCINE"] })).toMatchObject({ ok: false, error: expect.stringContaining("Critère invalide") });
  });

  it("signale les départements non reconnus", () => {
    expect(parseDepartements("59 20 2C 975 99 abc")).toEqual({ codes: ["59", "975"], invalid: ["20", "2C", "99", "abc"] });
    const r = parse({ departements: "59, 99" });
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("99") });
    expect(r.values.departements).toBe("59, 99");
  });

  it("le modèle « pompe à chaleur air/eau » se relit à l'identique", () => {
    const values = formValuesFrom({ name: "Modèle", details: null, active: true, criteria: HYDRAULIC_HEAT_PUMP_PRESET });
    const r = parsePartnerForm(formData(values));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.criteria).toEqual(HYDRAULIC_HEAT_PUMP_PRESET);
    for (const k of MULTI_FIELDS) expect(values[k]).toEqual(HYDRAULIC_HEAT_PUMP_PRESET[k]);
  });
});
