import { expect, test } from "@playwright/test";
import { fillEligibleQuestionnaire } from "./helpers";

test("parcours complet sur mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("link", { name: "Tester mon éligibilité" })).toBeVisible();
  // Aucun débordement horizontal sur petit écran.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await fillEligibleQuestionnaire(page);
  await expect(page.getByRole("heading", { name: "Votre projet est potentiellement éligible" })).toBeVisible();
  // Sur mobile, la barre fixe reprend l'action du bouton principal : on utilise le premier.
  await page.getByRole("button", { name: "Être recontacté(e)", exact: true }).first().click();
  await page.getByLabel("Prénom").fill("Morgane");
  await page.getByLabel("Nom", { exact: true }).fill("Mobile");
  await page.getByRole("button", { name: /Recevoir une réponse par e-mail/ }).click();
  await page.getByLabel("Adresse e-mail").fill("morgane@example.com");
  await page.waitForTimeout(2600);
  await page.getByRole("checkbox", { name: /Je demande à être contacté\(e\)/ }).check();
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByRole("heading", { name: "Votre demande est bien enregistrée" })).toBeVisible();
  const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflowAfter).toBeLessThanOrEqual(1);
});
