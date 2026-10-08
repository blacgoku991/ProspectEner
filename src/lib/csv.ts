import { stripInvisibleChars } from "./validation/contact";

/**
 * Génération CSV protégée contre l'injection de formules (CSV/Formula injection) :
 * toute cellule commençant par =, +, -, @, tabulation ou retour chariot est préfixée
 * d'une apostrophe, et toutes les cellules sont entre guillemets. Les caractères de contrôle
 * et les caractères invisibles (largeur nulle, direction du texte) sont retirés.
 */
const DANGEROUS_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let s = value instanceof Date ? value.toISOString() : String(value);
  s = stripInvisibleChars(s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""));
  if (DANGEROUS_START.test(s) || DANGEROUS_START.test(s.trimStart())) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** CSV séparé par des points-virgules (Excel français), précédé d'un BOM UTF-8. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(";")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}
