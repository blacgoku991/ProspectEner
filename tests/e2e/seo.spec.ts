import { expect, test } from "@playwright/test";

test.describe("référencement et pages d'information", () => {
  test("robots.txt, plan du site et non-indexation avant la mise en ligne", async ({ page, request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toMatch(/Sitemap: http:\/\/localhost:\d+\/sitemap\.xml/);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("<urlset");

    await page.goto("/");
    // La check-list de mise en ligne de l'environnement de test n'est pas complète : rien n'est indexable.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http:\/\/localhost:\d+\/?$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/opengraph-image$/);
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLd.flatMap((t) => [JSON.parse(t)].flat().map((x: { "@type": string }) => x["@type"]));
    expect(types).toEqual(expect.arrayContaining(["WebSite", "FAQPage"]));
    expect(await page.locator("h1").count()).toBe(1);
  });

  test("de l'accueil à une page de travaux, puis à la page d'une aide", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: /Pompe à chaleur/ }).first().click();
    await expect(page).toHaveURL(/\/travaux\/pompe-a-chaleur$/);
    await expect(page.getByRole("heading", { level: 1, name: /Aides pour installer une pompe à chaleur/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "MaPrimeRénov' par geste" })).toBeVisible();
    // Chargement direct (comme un robot d'indexation) : adresse canonique et fil d'Ariane balisé.
    await page.goto("/travaux/pompe-a-chaleur");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/travaux\/pompe-a-chaleur$/);
    const breadcrumb = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)).find((x) => x["@type"] === "BreadcrumbList");
    expect(breadcrumb?.itemListElement).toHaveLength(3);

    await page.getByRole("link", { name: "Conditions de cette aide" }).first().click();
    await expect(page).toHaveURL(/\/aides\/maprimerenov-par-geste$/);
    await expect(page.getByRole("heading", { level: 1, name: /MaPrimeRénov' par geste : conditions/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Qui peut en bénéficier ?" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Légifrance/ }).first()).toHaveAttribute("href", /^https:\/\/www\.legifrance\.gouv\.fr\//);
    await page.getByRole("main").getByRole("link", { name: "Tester mon éligibilité" }).click();
    await expect(page).toHaveURL(/\/simulation$/);
  });

  test("adresses inconnues : 404, et /travaux renvoie vers le guide", async ({ page, request }) => {
    expect((await request.get("/aides/aide-inventee")).status()).toBe(404);
    expect((await request.get("/travaux/piscine")).status()).toBe(404);
    await page.goto("/travaux");
    await expect(page).toHaveURL(/\/aides#travaux$/);
    await expect(page.getByRole("heading", { level: 1, name: /Les aides à la rénovation énergétique en \d{4}/ })).toBeVisible();
  });
});
