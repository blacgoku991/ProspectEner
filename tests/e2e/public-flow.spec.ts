import { expect, test } from "@playwright/test";
import { DEFAULT_RULESET } from "../../src/engine";
import { ADMIN, E2E_PARTNER } from "./config";
import {
  answerQuestionnaire,
  choose,
  fillEligibleQuestionnaire,
  HYDRAULIC_ELIGIBLE,
  householdValue,
  localDateTimeIn,
  login,
  next,
  setHouseholdSize,
} from "./helpers";

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
    // Le foyer est demandé juste après le type de logement, avec l'aide pour lire l'avis d'impôt.
    await expect(page.getByRole("heading", { name: /Combien de personnes composent votre foyer/ })).toBeVisible();
    await expect(page.getByText(/^Étape 2 sur \d+ · question 3 sur \d+$/)).toBeVisible();
    await expect(page.getByText("Qui compter dans le foyer ?")).toBeVisible();
    await setHouseholdSize(page, 3);
    await next(page);
    await expect(page.getByRole("heading", { name: /revenu fiscal de référence/ })).toBeVisible();
    await choose(page, /profil jaune/);
    await expect(page.getByRole("heading", { name: /Quels travaux envisagez-vous/ })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: /revenu fiscal de référence/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /profil jaune/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("heading", { name: /Combien de personnes composent votre foyer/ })).toBeVisible();
    await expect(householdValue(page)).toHaveText("3");
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
    await expect(page.getByText("Catégorie de revenus : Revenus modestes (profil jaune)")).toBeVisible();
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
    // Avec un rappel, l'e-mail et l'adresse du logement sont facultatifs.
    await page.getByLabel("Adresse e-mail (facultatif)").fill("dominique@example.com");
    await page.getByLabel("Adresse du logement (facultatif)").fill("12 rue des Lilas");
    await page.getByLabel("Commentaire (facultatif)").fill("Portail vert au fond de l'impasse");
    // Mise en relation : l'entreprise partenaire qui correspond aux réponses est nommée dans la demande, avant l'envoi.
    const confirm = page.getByRole("checkbox", {
      name: "Je demande à être contacté(e) par Rénovation Test E2E et par l'entreprise partenaire Chauffage Test E2E, Lyon, RGE, par téléphone, au sujet de mon projet de pompe à chaleur air/eau.",
    });
    await expect(confirm).not.toBeChecked();
    // Information courte sous le formulaire, le détail étant dans la politique de confidentialité.
    await expect(page.getByText(/Rénovation Test E2E utilise vos coordonnées et vos réponses uniquement pour répondre à votre demande/)).toBeVisible();
    // Mise en relation déclarée : la transmission à la seule entreprise nommée et la rémunération sont annoncées.
    await expect(page.getByText(/Si votre demande nomme une entreprise partenaire, elle lui est transmise, à elle seule/)).toBeVisible();
    await expect(page.getByText(/Ces mises en relation sont rémunérées par les entreprises partenaires/)).toBeVisible();
    await expect(page.getByRole("link", { name: "voir la politique de confidentialité" })).toHaveAttribute("href", "/confidentialite");
    await page.waitForTimeout(2600);
    await confirm.check();
    await page.getByRole("button", { name: "Envoyer ma demande" }).dblclick();
    await expect(page.getByRole("heading", { name: "Vous allez être recontacté(e)" })).toBeVisible();
    // Comme une confirmation classique : par qui, à quel numéro et quand la personne sera rappelée.
    await expect(page.getByText(/Un conseiller de Rénovation Test E2E va vous appeler au 06 98 76 54 32, au plus tard le/)).toBeVisible();
    await expect(page.getByText("Potentiellement éligible aux aides")).toBeVisible();
    await expect(page.getByText(/Aucun dossier d'aide n'a été déposé/)).toBeVisible();
    // L'entreprise nommée dans la demande est rappelée sur la confirmation.
    await expect(
      page.getByText(/Votre demande est également transmise à Chauffage Test E2E, Lyon, RGE, entreprise partenaire : elle pourra vous contacter, uniquement au sujet de ce projet\./),
    ).toBeVisible();
    const reference = (await page.locator("strong.font-mono").first().textContent())?.trim() ?? "";
    expect(reference).toMatch(/^PE-/);

    const admin = await context.newPage();
    await login(admin, ADMIN, "/admin/demandes");
    // L'équipe est informée dans le panel : nombre de nouvelles demandes dans le menu.
    await expect(admin.getByRole("link", { name: /^Demandes \d+ nouvelles? demandes?$/ }).first()).toBeVisible();
    await admin.goto(`/admin/demandes?q=${encodeURIComponent("Doubleclic")}`);
    await expect(admin.getByRole("link", { name: "Dominique Doubleclic" })).toHaveCount(1);
    // Liste : catégorie de revenus et installation actuelle sur la ligne de la demande.
    const listRow = admin.getByRole("row").filter({ hasText: "Dominique Doubleclic" });
    await expect(listRow.getByText("Jaune", { exact: true })).toBeVisible();
    await expect(listRow.getByText(/120 m²/)).toBeVisible();
    await admin.getByRole("link", { name: "Dominique Doubleclic" }).click();
    await expect(admin.getByText(reference)).toBeVisible();
    await expect(
      admin
        .getByText(
          /Je demande à être contacté\(e\) par Rénovation Test E2E et par l'entreprise partenaire Chauffage Test E2E, Lyon, RGE, par téléphone, au sujet de mon projet de pompe à chaleur air\/eau\./,
        )
        .first(),
    ).toBeVisible();
    await expect(admin.getByText("Potentiellement éligible").first()).toBeVisible();

    await test.step("fiche de la demande : coordonnées, installation, revenus et entreprise partenaire", async () => {
      const fiche = admin.locator("section").filter({ has: admin.getByRole("heading", { name: "Fiche de la demande" }) });
      await expect(fiche.getByTitle("Jaune · revenus modestes")).toBeVisible();
      await expect(fiche.getByText("12 rue des Lilas")).toBeVisible();
      await expect(fiche.getByRole("link", { name: "dominique@example.com" })).toHaveAttribute("href", "mailto:dominique@example.com");
      await expect(fiche.getByRole("link", { name: "06 98 76 54 32" })).toHaveAttribute("href", "tel:0698765432");
      await expect(fiche.getByText("Radiateurs à eau en fonte")).toBeVisible();
      await expect(fiche.getByText("120 m²")).toBeVisible();
      await expect(fiche.getByText("Dans le garage")).toBeVisible();
      await expect(fiche.getByText("Chaudière au fioul")).toBeVisible();
      // Le commentaire libre reste dans la demande, jamais dans la fiche transmise.
      await expect(fiche.getByText(/Portail vert/)).toHaveCount(0);
      const partners = admin.locator("section").filter({ has: admin.getByRole("heading", { name: "Entreprises partenaires" }) });
      // Entreprise nommée dans la demande, pas encore transmise.
      await expect(partners.getByText(`Entreprise nommée dans la demande : ${E2E_PARTNER.displayName}`)).toBeVisible();
      await expect(partners.getByText(/Pas encore transmise/)).toBeVisible();
      const partner = partners.getByRole("listitem").filter({ hasText: E2E_PARTNER.name });
      await expect(partner.getByText("Nommée dans la demande")).toBeVisible();
      await expect(partner.getByText("Correspond", { exact: true })).toBeVisible();
      await expect(partner.getByText(/\d+ critères remplis\./)).toBeVisible();
    });

    await test.step("entreprises partenaires : critères de l'entreprise et demandes correspondantes", async () => {
      await admin.goto("/admin/partenaires");
      await expect(admin.getByRole("heading", { level: 1, name: "Entreprises partenaires" })).toBeVisible();
      const card = admin.locator("section").filter({ has: admin.getByRole("heading", { name: E2E_PARTNER.name, exact: true }) });
      await expect(card.getByText(E2E_PARTNER.details, { exact: true })).toBeVisible();
      await expect(card.getByText("Active", { exact: true })).toBeVisible();
      await expect(card.getByText("Pompe à chaleur air/eau, Chauffe-eau thermodynamique")).toBeVisible();
      await expect(card.getByText("Bleu", { exact: true })).toBeVisible();
      await expect(card.getByText("Jaune", { exact: true })).toBeVisible();
      await expect(card.getByText("Radiateurs à eau en fonte, Radiateurs à eau en acier ou en aluminium")).toBeVisible();
      await expect(card.getByText("80 m² ou plus")).toBeVisible();
      await expect(card.getByText("Demandes qui la nomment", { exact: true })).toBeVisible();
      await expect(card.getByText(/dont \d+ à transmettre/)).toBeVisible();
      await expect(card.getByRole("link", { name: /^Transmettre (la nouvelle demande|les \d+ nouvelles demandes)$/ })).toHaveAttribute(
        "href",
        /\/admin\/partenaires\/[0-9a-f-]{36}#transmettre$/,
      );
      await card.getByRole("link", { name: "Voir ces demandes" }).click();
      await expect(admin).toHaveURL(/\/admin\/demandes\?partenaire=[0-9a-f-]{36}$/);
      await expect(admin.getByRole("region", { name: `Tri pour ${E2E_PARTNER.name}` })).toBeVisible();
      const row = admin.getByRole("row").filter({ hasText: "Dominique Doubleclic" });
      await expect(row.getByText("Correspond", { exact: true })).toBeVisible();
      await expect(row.getByText("Demandée", { exact: true })).toBeVisible();
      await row.getByRole("link", { name: "Dominique Doubleclic" }).click();
      await expect(admin.getByText(reference)).toBeVisible();
    });

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
    // L'entreprise nommée dans la demande est proposée d'office : sans l'accord coché, le bouton reste inactif.
    await expect(book).toBeDisabled();
    const partnerChoice = admin.getByLabel("Entreprise qui assure le rendez-vous");
    await partnerChoice.selectOption("");
    await expect(book).toBeEnabled();
    await admin.getByLabel("Date et heure (heure de Paris)").fill(localDateTimeIn(2));
    await admin.getByLabel("Projet et précisions", { exact: false }).fill("Pompe à chaleur air/eau, remplacement d'une chaudière fioul.");
    // Rendez-vous confié à l'entreprise partenaire qui correspond à tous ses critères (proposée d'office) :
    // l'accord de la personne est obligatoire et n'est jamais pré-coché.
    const partnerSelect = admin.getByLabel("Entreprise qui assure le rendez-vous");
    await partnerSelect.selectOption(E2E_PARTNER.displayName);
    await expect(book).toBeDisabled();
    const partnerConsent = admin.getByRole("checkbox", {
      name: /La personne a accepté que ses coordonnées et ses réponses \(logement, chauffage, revenus\) soient transmises à Chauffage Test E2E, Lyon, RGE/,
    });
    await expect(partnerConsent).not.toBeChecked();
    await partnerConsent.check();
    await expect(book).toBeEnabled();
    await book.click();
    await expect(admin.getByText(/^Rendez-vous le /).first()).toBeVisible();
    await expect(admin.getByText(/Éligibilité confirmée le .* : Primes énergie \(CEE\)/)).toBeVisible();
    await expect(admin.getByText("Rendez-vous fixé").first()).toBeVisible();
    await expect(admin.getByText(/accord de la personne pour la transmission recueilli le/)).toBeVisible();
    // Récapitulatif pour l'entreprise : la fiche (coordonnées, installation, revenus), jamais le commentaire libre.
    const recap = admin.getByLabel("Récapitulatif du rendez-vous");
    await expect(recap).toHaveValue(/Nom : Doubleclic/);
    await expect(recap).toHaveValue(/Prénom : Dominique/);
    await expect(recap).toHaveValue(/Adresse : 12 rue des Lilas/);
    await expect(recap).toHaveValue(/Téléphone : 06 98 76 54 32/);
    await expect(recap).toHaveValue(/E-mail : dominique@example\.com/);
    await expect(recap).toHaveValue(/Mode de chauffage : Chaudière au fioul/);
    await expect(recap).toHaveValue(/Diffusion de la chaleur : Radiateurs à eau en fonte/);
    await expect(recap).toHaveValue(/Nombre de radiateurs : 9/);
    await expect(recap).toHaveValue(/Surface chauffée : 120 m²/);
    await expect(recap).toHaveValue(/Emplacement de la chaudière : Dans le garage/);
    await expect(recap).toHaveValue(/Revenus .*: Jaune · revenus modestes/);
    await expect(recap).not.toHaveValue(/Portail vert/);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await admin.getByRole("button", { name: "Copier le récapitulatif" }).click();
    await expect(admin.getByText(/^Transmis le /)).toBeVisible();
    await expect(admin.getByText("Rendez-vous transmis à l'entreprise")).toBeVisible();
    await expect(
      admin.locator("section").filter({ has: admin.getByRole("heading", { name: "Entreprises partenaires" }) }).getByText("Rendez-vous confié à cette entreprise"),
    ).toBeVisible();
    await admin.goto("/admin");
    await expect(admin.getByRole("heading", { name: "Prochains rendez-vous" })).toBeVisible();
    await expect(admin.getByRole("link", { name: /Dominique Doubleclic/ })).toBeVisible();
  });

  test("revenus supérieurs (profil rose) : le résultat s'affiche, sans proposition de rendez-vous", async ({ page }) => {
    const persona = { ...HYDRAULIC_ELIGIBLE, income: /profil rose/ };
    await answerQuestionnaire(page, persona, { until: /^Quels travaux envisagez-vous/ });
    // Information donnée dès la question suivante ; le test continue normalement.
    const notice = page.getByRole("note").filter({ hasText: /Nous ne proposons pas de rendez-vous pour cette catégorie de revenus/ });
    await expect(notice).toBeVisible();
    await answerQuestionnaire(page, persona, { restart: false });
    // Le résultat lui-même ne change pas ; seul le rendez-vous n'est pas proposé.
    await expect(page.getByRole("heading", { name: "Votre projet est potentiellement éligible" })).toBeVisible();
    await expect(page.getByText("Catégorie de revenus : Revenus supérieurs (profil rose)")).toBeVisible();
    await expect(page.getByText(/Nous ne pouvons pas vous proposer de rendez-vous/)).toBeVisible();
    await expect(page.getByText(/Nos rendez-vous ne concernent pas la catégorie de revenus que vous avez indiquée/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Être recontacté(e)", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Être recontacté(e) par un conseiller" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Envoyer ma demande" })).toHaveCount(0);
    await expect(page.getByLabel("Prénom")).toHaveCount(0);
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
