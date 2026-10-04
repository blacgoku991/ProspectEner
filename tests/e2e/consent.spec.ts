import { expect, test } from "@playwright/test";

/** Bandeau de choix au premier passage (sans choix préenregistré). */
test.describe("bandeau cookies", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("refuser : rien n'est enregistré sur l'origine de la visite, et le bandeau ne revient pas", async ({ page, context }) => {
    await page.goto("/?utm_source=essai&utm_campaign=automne");
    const banner = page.getByRole("region", { name: "Choix des cookies" });
    await expect(banner).toBeVisible();
    // En haut de page, dans le flux : il ne recouvre jamais la mention France Rénov'.
    const notice = page.locator("[data-france-renov-notice]").first();
    const [b, n] = [await banner.boundingBox(), await notice.boundingBox()];
    expect(b && n && (b.y + b.height <= n.y || n.y + n.height <= b.y)).toBe(true);
    // « Refuser » et « Accepter » au même niveau.
    await expect(banner.getByRole("button", { name: "Refuser" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Accepter" })).toBeVisible();
    await banner.getByRole("button", { name: "Refuser" }).click();
    await expect(banner).toHaveCount(0);
    expect(await page.evaluate(() => sessionStorage.getItem("pe-acq"))).toBeNull();
    expect((await context.cookies()).find((c) => c.name === "pe-consent")?.value).toMatch(/^1\.0\.\d{13}$/);
    // Le choix est connu du serveur : la page suivante arrive sans bandeau.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Choix des cookies" })).toHaveCount(0);
  });

  test("accepter : l'origine de la visite est conservée pour la session, et le choix se modifie dans les préférences", async ({ page }) => {
    await page.goto("/?utm_source=essai&utm_campaign=automne");
    await page.getByRole("region", { name: "Choix des cookies" }).getByRole("button", { name: "Accepter" }).click();
    const acq = await page.evaluate(() => sessionStorage.getItem("pe-acq"));
    expect(JSON.parse(acq ?? "{}")).toMatchObject({ utmSource: "essai", utmCampaign: "automne" });
    await page.goto("/cookies");
    await expect(page.getByText("votre choix :")).toContainText("Accepté");
    await page.getByRole("main").getByRole("button", { name: "Refuser" }).click();
    await expect(page.getByText("votre choix :")).toContainText("Refusé");
    expect(await page.evaluate(() => sessionStorage.getItem("pe-acq"))).toBeNull();
  });
});
