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

/** Valeur affichée par le compteur « Combien de personnes composent votre foyer ? ». */
export function householdValue(page: Page) {
  return page.locator("output").filter({ hasText: /personnes?/ }).locator("span").first();
}

/** Règle le compteur de personnes du foyer avec les boutons + et −. */
export async function setHouseholdSize(page: Page, size: number) {
  const value = householdValue(page);
  for (let i = 0; i < 20; i++) {
    const current = Number((await value.textContent())?.trim());
    if (current === size) return;
    const target = current < size ? current + 1 : current - 1;
    await page.getByRole("button", { name: current < size ? "Une personne de plus" : "Une personne de moins" }).click();
    await expect(value).toHaveText(String(target));
  }
  throw new Error(`Impossible de régler le foyer à ${size} personne(s).`);
}

/**
 * Réponses d'un visiteur au questionnaire, par libellé des choix. Les questions sont reconnues
 * par leur titre : le parcours reste valable si l'ordre change ou si une question n'est pas posée.
 */
export interface Persona {
  postalCode: string;
  commune: string;
  housing: string;
  householdSize: number;
  /** Tranche de revenu fiscal de référence, reconnue par la couleur du profil (ex. /profil jaune/). */
  income: RegExp;
  /** Familles de travaux (cases à cocher). */
  works: RegExp[];
  heatPumpType?: string;
  currentHeating?: string;
  heatEmitters?: string;
  /** Nombre de radiateurs à eau ; « INCONNU » = « Je ne sais pas ». */
  radiatorCount?: number | "INCONNU";
  /** Surface chauffée en m² ; « INCONNU » = « Je ne sais pas ». */
  heatedArea?: number | "INCONNU";
  boilerLocation?: string;
  occupancy: string;
  residence: string;
  construction: string;
  contractor: string;
}

/** Cas « potentiellement éligible » : pompe à chaleur air/eau sur un chauffage central à eau, revenus modestes (profil jaune). */
export const HYDRAULIC_ELIGIBLE: Persona = {
  postalCode: "69003",
  commune: "Lyon 3e Arrondissement",
  housing: "Une maison",
  householdSize: 3,
  income: /profil jaune/,
  works: [/Pompe à chaleur/],
  heatPumpType: "Pompe à chaleur air/eau",
  currentHeating: "Chaudière au fioul",
  heatEmitters: "Radiateurs à eau en fonte",
  radiatorCount: 9,
  heatedArea: 120,
  boilerLocation: "Dans le garage",
  occupancy: "Propriétaire et j'y habite",
  residence: "Résidence principale",
  construction: "1975 – 2000",
  contractor: "Non, pas encore",
};

function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`Réponse « ${field} » attendue par le questionnaire mais absente du profil de test.`);
  return value;
}

async function fillNumber(page: Page, label: string, value: number | "INCONNU") {
  if (value === "INCONNU") return choose(page, "Je ne sais pas");
  await page.getByLabel(label).fill(String(value));
  await next(page);
}

type Answer = (page: Page, p: Persona) => Promise<void>;

/** Titre de la question → réponse. */
const ANSWERS: [RegExp, Answer][] = [
  [
    /^Où se situe le logement/,
    async (page, p) => {
      await page.getByLabel("Code postal du logement").fill(p.postalCode);
      await expect(page.getByText(p.commune)).toBeVisible();
      await next(page);
    },
  ],
  [/^De quel type de logement/, (page, p) => choose(page, p.housing)],
  [
    /^Combien de personnes composent votre foyer/,
    async (page, p) => {
      await setHouseholdSize(page, p.householdSize);
      await next(page);
    },
  ],
  [/^Quel est le revenu fiscal de référence/, (page, p) => choose(page, p.income)],
  [
    /^Quels travaux envisagez-vous/,
    async (page, p) => {
      for (const w of p.works) await page.getByRole("checkbox", { name: w }).click();
      await next(page);
    },
  ],
  [/^Quel type de pompe à chaleur/, (page, p) => choose(page, required(p.heatPumpType, "heatPumpType"))],
  [/^Comment le logement est-il chauffé/, (page, p) => choose(page, required(p.currentHeating, "currentHeating"))],
  [/^Comment la chaleur est-elle principalement diffusée/, (page, p) => choose(page, required(p.heatEmitters, "heatEmitters"))],
  [/^Combien de radiateurs à eau/, (page, p) => fillNumber(page, "Nombre de radiateurs à eau", required(p.radiatorCount, "radiatorCount"))],
  [/^Quelle est la surface chauffée/, (page, p) => fillNumber(page, "Surface chauffée, en m²", required(p.heatedArea, "heatedArea"))],
  [/^Où se trouve la chaudière/, (page, p) => choose(page, required(p.boilerLocation, "boilerLocation"))],
  [/^Votre chaudière gaz est-elle à condensation/, (page) => choose(page, /^Non$/)],
  [/^Prévoyez-vous de faire retirer la cuve à fioul/, (page) => choose(page, /^Non$/)],
  [/^Quelle est la classe énergétique/, (page) => choose(page, "Je ne sais pas")],
  [/^Quelle est votre situation vis-à-vis de ce logement/, (page, p) => choose(page, p.occupancy)],
  [/^Ce logement est-il votre résidence principale|^Comment le logement est-il loué/, (page, p) => choose(page, p.residence)],
  [
    /^Quand le logement a-t-il été construit/,
    async (page, p) => {
      await page.getByRole("button", { name: p.construction }).click();
      await next(page);
    },
  ],
  [/^Avez-vous déjà signé un devis/, (page) => choose(page, /^Non$/)],
  [/^Les travaux ont-ils déjà commencé/, (page) => choose(page, /^Non$/)],
  [/^Avez-vous déjà demandé ou obtenu une aide/, (page) => choose(page, /^Non$/)],
  [/^Avez-vous choisi une entreprise/, (page, p) => choose(page, p.contractor)],
];

/**
 * Répond au questionnaire jusqu'au résultat (ou jusqu'à la question `until`, sans y répondre).
 * `restart: false` reprend là où le questionnaire en est, sans recharger la page.
 */
export async function answerQuestionnaire(page: Page, persona: Persona = HYDRAULIC_ELIGIBLE, opts: { until?: RegExp; restart?: boolean } = {}) {
  if (opts.restart !== false) await page.goto("/simulation");
  const heading = page.locator("h1").first();
  for (let i = 0; i < 40; i++) {
    await heading.waitFor();
    const title = (await heading.textContent())?.trim() ?? "";
    if (title === "Résultat de votre simulation" || opts.until?.test(title)) return;
    const answer = ANSWERS.find(([re]) => re.test(title))?.[1];
    if (!answer) throw new Error(`Question non prévue par le parcours de test : « ${title} »`);
    await answer(page, persona);
    // Question suivante (ou résultat) affichée après l'animation de transition.
    await expect(heading).not.toHaveText(title, { timeout: 10_000 });
  }
  throw new Error("Le questionnaire ne se termine pas : parcours interrompu.");
}

/** Questionnaire complet (réglage par défaut) du cas « potentiellement éligible ». */
export async function fillEligibleQuestionnaire(page: Page, overrides: Partial<Persona> = {}) {
  await answerQuestionnaire(page, { ...HYDRAULIC_ELIGIBLE, ...overrides });
}

/** Date et heure locales (AAAA-MM-JJTHH:MM) dans `days` jours, pour un champ « datetime-local ». */
export function localDateTimeIn(days: number, hour = 10): string {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00`;
}
