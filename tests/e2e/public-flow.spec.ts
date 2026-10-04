import { expect, test } from "@playwright/test";
import { DEFAULT_RULESET } from "../../src/engine";
import { ADMIN } from "./config";
import { choose, fillEligibleQuestionnaire, localDateTimeIn, login, next } from "./helpers";

test.describe("parcours public complet", () => {
  test("accueil : positionnement transparent et mention France Rénov'", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'.").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /www\.france-renov\.gouv\.fr/ }).first()).toHaveAttribute("href", "https://france-renov.gouv.fr/servicepublic");
    await expect(page.getByRole("main").getByRole("link", { name: "Tester mon éligibilité" })).toBeVisible();
    // Rappel sans test désactivé par défaut : seules les personnes qualifiées par le test demandent un rendez-vous.
    await expect(page.getByRole("main").getByRole("link", { name: /Je préfère être recontacté/ })).toHaveCount(0);
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
    const verdict = page.getByRole("heading", { name: "Votre projet est potentiellement éligible" });
    await expect(verdict).toBeVisible();
    await expect(page.getByText(/pourrait correspondre à certaines aides/)).toBeVisible();
    // Le visiteur voit un verdict, sans le nom des aides (présentées lors de l'étude).
    await expect(page.getByRole("main").getByText(/MaPrimeRénov'|Primes énergie|certificats d'économies|Éco-prêt/)).toHaveCount(0);
    await expect(page.getByText("Service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'.").first()).toBeVisible();
    await expect(page.getByText(/ne dépose aucun dossier/).first()).toBeVisible();
    // Le résultat s'affiche d'abord ; le formulaire de rappel suit directement, sans obligation de le remplir.
    const formTitle = page.getByRole("heading", { name: "Être recontacté(e) par un conseiller" });
    await expect(formTitle).toBeVisible();
    expect((await verdict.boundingBox())!.y).toBeLessThan((await formTitle.boundingBox())!.y);
    await expect(page.getByLabel("Numéro de téléphone")).toHaveCount(0);

    // Le bouton principal (la barre fixe en reprend l'action quand il n'est pas visible).
    await page.getByRole("button", { name: "Être recontacté(e)", exact: true }).first().click();
    await page.getByLabel("Prénom").fill("Dominique");
    await page.getByLabel("Nom", { exact: true }).fill("Doubleclic");
    await page.getByRole("button", { name: /Être rappelé\(e\) par téléphone/ }).click();
    await page.getByLabel("Numéro de téléphone").fill("06 98 76 54 32");
    const confirm = page.getByRole("checkbox", { name: /Je demande à être contacté\(e\) par Rénovation Test E2E, par téléphone/ });
    await expect(confirm).not.toBeChecked();
    await expect(page.getByText(/Responsable du traitement : Rénovation Test E2E/)).toBeVisible();
    // Mise en relation déclarée : la notice annonce la transmission, limitée au rendez-vous accepté.
    await expect(page.getByText(/Uniquement si vous acceptez un rendez-vous, l'entreprise partenaire qui en est chargée reçoit vos coordonnées/)).toBeVisible();
    await page.waitForTimeout(2600);
    await confirm.check();
    await page.getByRole("button", { name: "Envoyer ma demande" }).dblclick();
    await expect(page.getByRole("heading", { name: "Merci, vous allez être recontacté(e)" })).toBeVisible();
    await expect(page.getByText(/Aucun dossier d'aide n'a été déposé/)).toBeVisible();
    const reference = (await page.locator("strong.font-mono").first().textContent())?.trim() ?? "";
    expect(reference).toMatch(/^PE-/);

    const admin = await context.newPage();
    await login(admin, ADMIN, "/admin/demandes");
    // L'équipe est informée dans le panel : nombre de nouvelles demandes dans le menu.
    await expect(admin.getByRole("link", { name: /^Demandes \d+ nouvelles? demandes?$/ }).first()).toBeVisible();
    await admin.goto(`/admin/demandes?q=${encodeURIComponent("Doubleclic")}`);
    await expect(admin.getByRole("link", { name: "Dominique Doubleclic" })).toHaveCount(1);
    await admin.getByRole("link", { name: "Dominique Doubleclic" }).click();
    await expect(admin.getByText(reference)).toBeVisible();
    await expect(admin.getByText(/Je demande à être contacté\(e\) par Rénovation Test E2E, par téléphone, au sujet de mon projet de pompe à chaleur air\/eau\./).first()).toBeVisible();
    await expect(admin.getByText("Potentiellement éligible").first()).toBeVisible();
    // L'équipe reçoit la synthèse complète, avec le nom des aides.
    await expect(admin.getByRole("heading", { name: "Synthèse d'éligibilité" })).toBeVisible();
    await expect(admin.getByText("MaPrimeRénov' par geste").first()).toBeVisible();
    await expect(admin.getByText("« Votre projet est potentiellement éligible »")).toBeVisible();
    await expect(admin.getByText(`barème ${DEFAULT_RULESET.version}`, { exact: false })).toBeVisible();

    // Qualification avant rendez-vous : le bouton reste inactif tant qu'aucune aide n'est entièrement confirmée.
    await expect(admin.getByRole("heading", { name: "Qualification et rendez-vous" })).toBeVisible();
    const book = admin.getByRole("button", { name: "Fixer le rendez-vous" });
    await expect(book).toBeDisabled();
    const cee = admin.getByRole("group", { name: /Primes énergie/ });
    for (const box of await cee.getByRole("checkbox").all()) await box.check();
    await expect(book).toBeEnabled();
    await admin.getByLabel("Date et heure (heure de Paris)").fill(localDateTimeIn(2));
    await admin.getByLabel("Projet et précisions", { exact: false }).fill("Pompe à chaleur air/eau, remplacement d'une chaudière fioul.");
    // Rendez-vous confié à l'entreprise de travaux : l'accord de la personne est obligatoire.
    await admin.getByLabel("Entreprise qui assure le rendez-vous", { exact: false }).fill("Chauffage Test E2E, Lyon, RGE");
    await expect(book).toBeDisabled();
    await admin.getByRole("checkbox", { name: /La personne a accepté que ses coordonnées et son projet soient transmis à Chauffage Test E2E/ }).check();
    await expect(book).toBeEnabled();
    await book.click();
    await expect(admin.getByText(/^Rendez-vous le /).first()).toBeVisible();
    await expect(admin.getByText(/Éligibilité confirmée le .* : Primes énergie \(CEE\)/)).toBeVisible();
    await expect(admin.getByText("Rendez-vous fixé").first()).toBeVisible();
    await expect(admin.getByText(/accord de la personne pour la transmission recueilli le/)).toBeVisible();
    // Récapitulatif pour l'entreprise : sans revenus ; sa transmission est tracée.
    const recap = admin.getByLabel("Récapitulatif du rendez-vous");
    await expect(recap).toHaveValue(/Client : Dominique Doubleclic/);
    await expect(recap).toHaveValue(/Téléphone : 06 98 76 54 32/);
    await expect(recap).not.toHaveValue(/Revenu/);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await admin.getByRole("button", { name: "Copier le récapitulatif" }).click();
    await expect(admin.getByText(/^Transmis le /)).toBeVisible();
    await expect(admin.getByText("Rendez-vous transmis à l'entreprise")).toBeVisible();
    await admin.goto("/admin");
    await expect(admin.getByRole("heading", { name: "Prochains rendez-vous" })).toBeVisible();
    await expect(admin.getByRole("link", { name: /Dominique Doubleclic/ })).toBeVisible();
  });

  test("territoire hors périmètre : résultat sans conclusion abusive", async ({ page }) => {
    await page.goto("/simulation");
    await page.getByLabel("Code postal du logement").fill("97400");
    await expect(page.getByText(/hors périmètre du simulateur/)).toBeVisible();
    await page.getByRole("button", { name: /Voir mon résultat|Continuer/ }).click();
    await expect(page.getByRole("heading", { name: "Hors du périmètre du simulateur" })).toBeVisible();
    await expect(page.getByText(/une étude complémentaire est nécessaire/)).toBeVisible();
    // Hors périmètre : pas de rendez-vous proposé, orientation vers le service public.
    await expect(page.getByText(/Nous ne pouvons pas vous proposer de rendez-vous/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Être recontacté(e)", exact: true })).toHaveCount(0);
  });
});
