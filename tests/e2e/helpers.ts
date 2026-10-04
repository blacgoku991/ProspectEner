import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32(secret: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of secret) {
    value = (value << 5) | ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Code TOTP pour un pas donné (par défaut le pas courant). */
export function totp(secret: string, step = Math.floor(Date.now() / 30000)): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const d = createHmac("sha1", base32(secret)).update(counter).digest();
  const o = d[d.length - 1]! & 15;
  const bin = ((d[o]! & 127) << 24) | (d[o + 1]! << 16) | (d[o + 2]! << 8) | d[o + 3]!;
  return String(bin % 1e6).padStart(6, "0");
}

let lastStepUsed = new Map<string, number>();

/** Connexion complète (mot de passe + TOTP), en évitant de réutiliser un pas déjà consommé. */
export async function login(page: Page, user: { email: string; password: string; totpSecret: string }, next?: string) {
  await page.goto(next ? `/admin/connexion?suite=${encodeURIComponent(next)}` : "/admin/connexion");
  await page.getByLabel("Adresse e-mail").fill(user.email);
  await page.getByLabel("Mot de passe").fill(user.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/admin\/mfa/);
  let step = Math.floor(Date.now() / 30000);
  if ((lastStepUsed.get(user.email) ?? -1) >= step) {
    await page.waitForTimeout(30000 - (Date.now() % 30000) + 200);
    step = Math.floor(Date.now() / 30000);
  }
  lastStepUsed.set(user.email, step);
  await page.getByLabel(/Code à 6 chiffres/).fill(totp(user.totpSecret, step));
  await page.getByRole("button", { name: "Valider" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/admin/mfa"));
}

export function resetTotpMemory() {
  lastStepUsed = new Map();
}

/** Clique un choix du questionnaire (boutons à sélection) et attend l'avance automatique. */
export async function choose(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name }).first().click();
  await page.waitForTimeout(400);
}

export async function next(page: Page) {
  await page.getByRole("button", { name: /Continuer|Voir mon résultat/ }).click();
  await page.waitForTimeout(400);
}

/** Questionnaire complet du cas « potentiellement éligible ». */
export async function fillEligibleQuestionnaire(page: Page) {
  await page.goto("/simulation");
  await page.getByLabel("Code postal du logement").fill("69003");
  await expect(page.getByText("Lyon 3e Arrondissement")).toBeVisible();
  await next(page);
  await choose(page, "Une maison");
  await choose(page, "Propriétaire et j'y habite");
  await choose(page, "Résidence principale");
  await page.getByRole("button", { name: "1975 – 2000" }).click();
  await next(page);
  await page.getByRole("checkbox", { name: /Pompe à chaleur/ }).click();
  await next(page);
  await choose(page, "Pompe à chaleur air/eau");
  await choose(page, "Chaudière au fioul");
  // Barème 2026.10-2 : question complémentaire sur la dépose de la cuve.
  await expect(page.getByText("Prévoyez-vous de faire retirer la cuve à fioul ?")).toBeVisible();
  await choose(page, /^Non$/); // dépose de cuve
  await choose(page, /^Non$/); // devis
  await choose(page, /^Non$/); // travaux commencés
  await choose(page, /^Non$/); // aide antérieure
  await choose(page, "Non, pas encore");
  await page.getByRole("button", { name: "Une personne de plus" }).click();
  await page.getByRole("button", { name: "Une personne de plus" }).click();
  await next(page);
  await choose(page, /De 30\s?541/);
}
