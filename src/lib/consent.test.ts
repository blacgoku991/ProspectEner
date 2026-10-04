import { describe, expect, it } from "vitest";
import { parseConsent, serializeConsent } from "./consent";

const NOW = Date.parse("2026-10-04T12:00:00Z");

describe("choix sur les traceurs", () => {
  it("lit un choix valide", () => {
    const at = Date.parse("2026-10-01T12:00:00Z");
    expect(parseConsent(`1.0.${at}`, NOW)).toEqual({ acquisition: false, at });
    expect(parseConsent(serializeConsent(true, NOW), NOW)).toEqual({ acquisition: true, at: NOW });
  });

  it("redemande après 6 mois, ou si la valeur est illisible", () => {
    expect(parseConsent(`1.1.${Date.parse("2026-03-01T12:00:00Z")}`, NOW)).toBeNull();
    expect(parseConsent("n'importe quoi", NOW)).toBeNull();
    expect(parseConsent(`2.1.${NOW}`, NOW)).toBeNull();
    expect(parseConsent(`1.1.${NOW + 3_600_000}`, NOW)).toBeNull();
    expect(parseConsent(null, NOW)).toBeNull();
  });
});
