/**
 * Calendrier français : jours fériés, jours ouvrables et fuseau Europe/Paris.
 *
 * - Jours fériés légaux (art. L3133-1 du Code du travail), + Vendredi saint et 26 décembre
 *   en Alsace-Moselle (option).
 * - Jours ouvrables : tous les jours sauf le dimanche et les jours fériés (le samedi compte).
 * - Délai de rappel « dans les cinq jours ouvrables suivant la demande » (art. R223-4 du Code
 *   de la consommation) : le jour de la demande n'est pas compté ; l'échéance est la fin du
 *   5e jour ouvrable suivant (heure de Paris).
 */

export const PARIS_TZ = "Europe/Paris";

export interface Ymd {
  year: number;
  month: number;
  day: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const ymdToIso = (d: Ymd) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;

function addDays(d: Ymd, days: number): Ymd {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

/** 0 = dimanche … 6 = samedi */
export function weekday(d: Ymd): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
}

/** Dimanche de Pâques (algorithme grégorien anonyme / Meeus-Jones-Butcher). */
export function easterSunday(year: number): Ymd {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

export interface HolidayOptions {
  alsaceMoselle?: boolean;
}

export function frenchHolidays(year: number, options: HolidayOptions = {}): Map<string, string> {
  const easter = easterSunday(year);
  const list: [Ymd, string][] = [
    [{ year, month: 1, day: 1 }, "Jour de l'an"],
    [addDays(easter, 1), "Lundi de Pâques"],
    [{ year, month: 5, day: 1 }, "Fête du travail"],
    [{ year, month: 5, day: 8 }, "Victoire 1945"],
    [addDays(easter, 39), "Ascension"],
    [addDays(easter, 50), "Lundi de Pentecôte"],
    [{ year, month: 7, day: 14 }, "Fête nationale"],
    [{ year, month: 8, day: 15 }, "Assomption"],
    [{ year, month: 11, day: 1 }, "Toussaint"],
    [{ year, month: 11, day: 11 }, "Armistice 1918"],
    [{ year, month: 12, day: 25 }, "Noël"],
  ];
  if (options.alsaceMoselle) {
    list.push([addDays(easter, -2), "Vendredi saint (Alsace-Moselle)"]);
    list.push([{ year, month: 12, day: 26 }, "Saint-Étienne (Alsace-Moselle)"]);
  }
  return new Map(list.map(([d, name]) => [ymdToIso(d), name]));
}

export function isHoliday(d: Ymd, options: HolidayOptions = {}): boolean {
  return frenchHolidays(d.year, options).has(ymdToIso(d));
}

export function isJourOuvrable(d: Ymd, options: HolidayOptions = {}): boolean {
  return weekday(d) !== 0 && !isHoliday(d, options);
}

// ─── Fuseau Europe/Paris ────────────────────────────────────────────────────

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: PARIS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export interface ZonedParts extends Ymd {
  hour: number;
  minute: number;
  second: number;
}

export function parisParts(date: Date): ZonedParts {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Date du jour à Paris au format AAAA-MM-JJ. */
export function parisToday(now: Date = new Date()): string {
  return ymdToIso(parisParts(now));
}

function offsetMs(date: Date): number {
  const p = parisParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instant UTC correspondant à une heure locale de Paris. */
export function parisTimeToUtc(d: Ymd, hour: number, minute: number, second: number, ms = 0): Date {
  const guess = Date.UTC(d.year, d.month - 1, d.day, hour, minute, second, ms);
  const first = guess - offsetMs(new Date(guess));
  const second2 = guess - offsetMs(new Date(first));
  return new Date(second2);
}

/**
 * Échéance « N jours ouvrables suivant » un instant : fin (23:59:59.999, heure de Paris)
 * du N-ième jour ouvrable après le jour de la demande (non compté).
 */
export function addJoursOuvrables(from: Date, n: number, options: HolidayOptions = {}): Date {
  if (!Number.isInteger(n) || n < 1) throw new Error("Nombre de jours ouvrables invalide");
  let cursor: Ymd = parisParts(from);
  let counted = 0;
  while (counted < n) {
    cursor = addDays(cursor, 1);
    if (isJourOuvrable(cursor, options)) counted++;
  }
  return parisTimeToUtc(cursor, 23, 59, 59, 999);
}

/** Jours ouvrables restants (entiers, ≥ 0) avant l'échéance. */
export function joursOuvrablesRestants(now: Date, deadline: Date, options: HolidayOptions = {}): number {
  if (now.getTime() > deadline.getTime()) return 0;
  let cursor: Ymd = parisParts(now);
  const end = parisParts(deadline);
  let count = 0;
  while (ymdToIso(cursor) < ymdToIso(end)) {
    cursor = addDays(cursor, 1);
    if (isJourOuvrable(cursor, options)) count++;
  }
  return count;
}

/**
 * Créneaux d'appel recommandés par prudence (encadrement des jours et horaires du démarchage,
 * art. D223-9) : du lundi au vendredi hors jours fériés, 10h-13h et 14h-20h (heure de Paris).
 */
export function isWithinRecommendedCallWindow(now: Date, options: HolidayOptions = {}): boolean {
  const p = parisParts(now);
  const wd = weekday(p);
  if (wd === 0 || wd === 6 || isHoliday(p, options)) return false;
  const minutes = p.hour * 60 + p.minute;
  return (minutes >= 600 && minutes < 780) || (minutes >= 840 && minutes < 1200);
}

/** Date et heure locales de Paris saisies dans un champ « datetime-local » (AAAA-MM-JJTHH:MM), ou null. */
export function parseParisLocalDateTime(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const date = parisTimeToUtc({ year, month, day }, hour, minute, 0);
  // Rejette les dates impossibles (31 février…) : la date relue doit être celle saisie.
  const back = parisParts(date);
  return back.year === year && back.month === month && back.day === day ? date : null;
}
