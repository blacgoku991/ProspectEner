import { expect, test } from "@playwright/test";
import { ADMIN, COLLAB, E2E_ENV } from "./config";
import { fillEligibleQuestionnaire, login } from "./helpers";

test.describe("annulation d'une demande de contact", () => {
  test("demande après le test puis annulation via le lien personnel, visible dans l'administration", async ({ page, context }) => {
    // Rappel sans test désactivé par défaut : la page renvoie vers le test d'éligibilité.
    await page.goto("/rappel");
    await expect(page.getByRole("link", { name: "Faire le test d'éligibilité" })).toBeVisible();
    await fillEligibleQuestionnaire(page);
    await page.getByRole("button", { name: "Être recontacté(e)", exact: true }).first().click();
    await page.getByLabel("Prénom").fill("Annie");
    await page.getByLabel("Nom", { exact: true }).fill("Annulation");
    await page.getByRole("button", { name: /Recevoir une réponse par e-mail/ }).click();
    await page.getByLabel("Adresse e-mail").fill("annie@example.com");
    await page.waitForTimeout(2600);
    await page.getByRole("checkbox", { name: /Je demande à être contacté\(e\)/ }).check();
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page.getByRole("heading", { name: "Merci, vous allez être recontacté(e)" })).toBeVisible();

    await page.getByRole("link", { name: "Annuler maintenant" }).click();
    await expect(page.getByRole("heading", { name: "Annuler une demande de contact" })).toBeVisible();
    // Le jeton est retiré de la barre d'adresse.
    await expect.poll(() => page.url()).not.toContain("t=");
    await page.getByLabel(/Effacer également mes coordonnées/).check();
    await page.getByRole("button", { name: "Annuler ma demande de contact" }).click();
    await expect(page.getByRole("heading", { name: "Votre demande est annulée" })).toBeVisible();

    const admin = await context.newPage();
    await login(admin, ADMIN, "/admin/demandes");
    await admin.goto("/admin/demandes?status=CONTACT_ANNULE");
    await expect(admin.getByText("Anonymisé").first()).toBeVisible();
  });
});

test.describe("contrôle d'accès à l'administration", () => {
  test("sans session : redirection vers la connexion, export et tâches protégés", async ({ page, request }) => {
    await page.goto("/admin/demandes");
    await expect(page).toHaveURL(/\/admin\/connexion\?suite=%2Fadmin%2Fdemandes/);
    const exportRes = await request.get("/admin/demandes/export", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(exportRes.status());
    const cron = await request.get("/api/cron");
    expect(cron.status()).toBe(401);
    const cronOk = await request.get("/api/cron", { headers: { authorization: `Bearer ${E2E_ENV.CRON_SECRET}` } });
    expect(cronOk.status()).toBe(200);
  });

  test("mauvais mot de passe : message générique", async ({ page }) => {
    await page.goto("/admin/connexion");
    await page.getByLabel("Adresse e-mail").fill(ADMIN.email);
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Identifiants invalides/ })).toBeVisible();
  });

  test("un mot de passe correct ne suffit pas : second facteur exigé", async ({ page }) => {
    await page.goto("/admin/connexion");
    await page.getByLabel("Adresse e-mail").fill(ADMIN.email);
    await page.getByLabel("Mot de passe").fill(ADMIN.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/admin\/mfa/);
    await page.goto("/admin/demandes");
    await expect(page).toHaveURL(/\/admin\/mfa/);
    await page.getByLabel(/Code à 6 chiffres/).fill("000000");
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Code invalide/ })).toBeVisible();
  });

  test("collaborateur : pas d'accès aux pages d'administration ni à l'export", async ({ page }) => {
    await login(page, COLLAB);
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Paramètres" })).toHaveCount(0);
    const settings = await page.goto("/admin/parametres");
    expect(settings?.status()).toBe(404);
    const users = await page.goto("/admin/equipe");
    expect(users?.status()).toBe(404);
    const exp = await page.goto("/admin/demandes/export");
    expect(exp?.status()).toBe(403);
    const unknown = await page.goto("/admin/demandes/00000000-0000-0000-0000-000000000000");
    expect(unknown?.status()).toBe(404);
  });
});
