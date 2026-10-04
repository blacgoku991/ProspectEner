import { describe, expect, it } from "vitest";
import {
  addJoursOuvrables,
  easterSunday,
  frenchHolidays,
  isJourOuvrable,
  isWithinRecommendedCallWindow,
  joursOuvrablesRestants,
  parisParts,
  parisTimeToUtc,
  parisToday,
  ymdToIso,
} from "./business-days";

const paris = (iso: string) => {
  const p = parisParts(new Date(iso));
  return `${ymdToIso(p)} ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
};

describe("jours fériés", () => {
  it("calcule Pâques et les fêtes mobiles", () => {
    expect(ymdToIso(easterSunday(2026))).toBe("2026-04-05");
    expect(ymdToIso(easterSunday(2027))).toBe("2027-03-28");
    const h = frenchHolidays(2026);
    expect(h.get("2026-04-06")).toBe("Lundi de Pâques");
    expect(h.get("2026-05-14")).toBe("Ascension");
    expect(h.get("2026-05-25")).toBe("Lundi de Pentecôte");
    expect(h.size).toBe(11);
    expect(frenchHolidays(2026, { alsaceMoselle: true }).size).toBe(13);
  });

  it("jours ouvrables : le samedi compte, pas le dimanche ni les jours fériés", () => {
    expect(isJourOuvrable({ year: 2026, month: 10, day: 3 })).toBe(true); // samedi
    expect(isJourOuvrable({ year: 2026, month: 10, day: 4 })).toBe(false); // dimanche
    expect(isJourOuvrable({ year: 2026, month: 11, day: 11 })).toBe(false); // férié
  });
});

describe("délai de 5 jours ouvrables (art. R223-4)", () => {
  it("demande le vendredi 2 octobre 2026 → échéance jeudi 8 octobre", () => {
    expect(paris(addJoursOuvrables(new Date("2026-10-02T09:00:00Z"), 5).toISOString())).toBe("2026-10-08 23:59");
  });

  it("demande le lundi 9 novembre 2026 (11 novembre férié) → lundi 16 novembre", () => {
    expect(paris(addJoursOuvrables(new Date("2026-11-09T15:00:00Z"), 5).toISOString())).toBe("2026-11-16 23:59");
  });

  it("demande le mercredi 23 décembre 2026 (Noël férié) → mercredi 30 décembre", () => {
    expect(paris(addJoursOuvrables(new Date("2026-12-23T08:00:00Z"), 5).toISOString())).toBe("2026-12-30 23:59");
  });

  it("utilise la date de Paris, pas la date UTC (demande tardive le soir)", () => {
    // 23h30 à Paris le samedi 3 octobre = 21h30 UTC : le jour de la demande est bien le samedi.
    expect(paris(addJoursOuvrables(new Date("2026-10-03T21:30:00Z"), 5).toISOString())).toBe("2026-10-09 23:59");
    // 00h30 à Paris le dimanche 4 octobre = 22h30 UTC le samedi.
    expect(paris(addJoursOuvrables(new Date("2026-10-03T22:30:00Z"), 5).toISOString())).toBe("2026-10-09 23:59");
  });

  it("gère le changement d'heure (25 octobre 2026)", () => {
    const deadline = addJoursOuvrables(new Date("2026-10-22T10:00:00Z"), 5);
    expect(paris(deadline.toISOString())).toBe("2026-10-28 23:59");
    expect(deadline.toISOString()).toBe("2026-10-28T22:59:59.999Z"); // CET = UTC+1
    expect(parisTimeToUtc({ year: 2026, month: 7, day: 1 }, 23, 59, 59, 999).toISOString()).toBe("2026-07-01T21:59:59.999Z");
  });

  it("jours restants", () => {
    const from = new Date("2026-10-02T09:00:00Z");
    const deadline = addJoursOuvrables(from, 5);
    expect(joursOuvrablesRestants(from, deadline)).toBe(5);
    expect(joursOuvrablesRestants(new Date("2026-10-09T09:00:00Z"), deadline)).toBe(0);
  });

  it("refuse un nombre de jours invalide", () => {
    expect(() => addJoursOuvrables(new Date(), 0)).toThrow();
  });
});

describe("créneaux d'appel recommandés", () => {
  it("lundi-vendredi 10h-13h et 14h-20h (heure de Paris), hors jours fériés", () => {
    expect(isWithinRecommendedCallWindow(new Date("2026-10-05T08:30:00Z"))).toBe(true); // lundi 10h30
    expect(isWithinRecommendedCallWindow(new Date("2026-10-05T11:30:00Z"))).toBe(false); // 13h30
    expect(isWithinRecommendedCallWindow(new Date("2026-10-05T17:59:00Z"))).toBe(true); // 19h59
    expect(isWithinRecommendedCallWindow(new Date("2026-10-05T18:00:00Z"))).toBe(false); // 20h00
    expect(isWithinRecommendedCallWindow(new Date("2026-10-03T09:00:00Z"))).toBe(false); // samedi
    expect(isWithinRecommendedCallWindow(new Date("2026-11-11T10:00:00Z"))).toBe(false); // férié
  });

  it("date du jour à Paris", () => {
    expect(parisToday(new Date("2026-10-03T22:30:00Z"))).toBe("2026-10-04");
  });
});
