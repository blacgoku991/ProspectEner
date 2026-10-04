import { expect, test } from "@playwright/test";
import { ADMIN } from "./config";
import { choose, fillEligibleQuestionnaire, login, next } from "./helpers";

test.describe("parcours public complet", () => {
  test("accueil : positionnement transparent et mention France Rénov'", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'.").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /www\.france-renov\.gouv\.fr/ }).first()).toHaveAttribute("href", "https://france-renov.gouv.fr/servicepublic");
    await expect(page.getByRole("main").getByRole("link", { name: "Tester mon éligibilité" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /Je préfère être recontacté/ })).toBeVisible();
  });

  test("retour en arrière sans perte des réponses (bouton Retour et bouton précédent du navigateur)", async ({ page }) => {
    await page.goto("/simulation");
    await page.getByLabel("Code postal du logement").fill("69003");
    await expect(page.getByText("Lyon 3e Arrondissement")).toBeVisible();
    await next(page);
    await choose(page, "Une maison");
    await choose(page, "Propriétaire et j'y habite");
    await expect(page.getByRole("heading", { name: /résidence principale/i })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: /situation vis-à-vis/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Propriétaire et j'y habite" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("button", { name: "Une maison" })).toHaveAttribute("aria-pressed", "true");
    // Rechargement : les réponses de la session sont conservées.
    await page.reload();
    await expect(page.getByRole("button", { name: "Une maison" })).toHaveAttribute("aria-pressed", "true");
  });

  test("résultat avant coordonnées, demande explicite, double-clic, puis apparition dans l'administration", async ({ page, context }) => {
    await fillEligibleQuestionnaire(page);
    await expect(page.getByRole("heading", { name: /pourrait correspondre à certaines aides/ })).toBeVisible();
    await expect(page.getByText("Service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'.").first()).toBeVisible();
    await expect(page.getByText(/ne dépose aucun dossier/).first()).toBeVisible();
    // Aucune coordonnée n'a été demandée à ce stade.
    await expect(page.getByLabel("Numéro de téléphone")).toHaveCount(0);

    await page.getByRole("button", { name: "Demander une étude de mon projet" }).click();
    await page.getByLabel("Prénom").fill("Dominique");
    await page.getByLabel("Nom", { exact: true }).fill("Doubleclic");
    await page.getByRole("button", { name: /Être rappelé\(e\) par téléphone/ }).click();
    await page.getByLabel("Numéro de téléphone").fill("06 98 76 54 32");
    const confirm = page.getByRole("checkbox", { name: /Je demande à être contacté\(e\) par Rénovation Test E2E, par téléphone/ });
    await expect(confirm).not.toBeChecked();
    await expect(page.getByText(/Responsable du traitement : Rénovation Test E2E/)).toBeVisible();
    await page.waitForTimeout(2600);
    await confirm.check();
    await page.getByRole("button", { name: "Envoyer ma demande" }).dblclick();
    await expect(page.getByRole("heading", { name: "Votre demande est bien enregistrée" })).toBeVisible();
    await expect(page.getByText(/Aucun dossier d'aide n'a été déposé/)).toBeVisible();
    const reference = (await page.locator("strong.font-mono").first().textContent())?.trim() ?? "";
    expect(reference).toMatch(/^PE-/);

    const admin = await context.newPage();
    await login(admin, ADMIN, "/admin/demandes");
    await admin.goto(`/admin/demandes?q=${encodeURIComponent("Doubleclic")}`);
    await expect(admin.getByRole("link", { name: "Dominique Doubleclic" })).toHaveCount(1);
    await admin.getByRole("link", { name: "Dominique Doubleclic" }).click();
    await expect(admin.getByText(reference)).toBeVisible();
    await expect(admin.getByText(/Je demande à être contacté\(e\) par Rénovation Test E2E, par téléphone, au sujet de mon projet de pompe à chaleur air\/eau\./).first()).toBeVisible();
    await expect(admin.getByText("Potentiellement éligible").first()).toBeVisible();
    await expect(admin.getByText(/barème 2026\.10-1/)).toBeVisible();
  });

  test("territoire hors périmètre : résultat sans conclusion abusive", async ({ page }) => {
    await page.goto("/simulation");
    await page.getByLabel("Code postal du logement").fill("97400");
    await expect(page.getByText(/hors périmètre du simulateur/)).toBeVisible();
    await page.getByRole("button", { name: /Voir mon résultat|Continuer/ }).click();
    await expect(page.getByRole("heading", { name: /hors du périmètre de ce simulateur/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Demander une étude complémentaire" })).toBeVisible();
  });
});
