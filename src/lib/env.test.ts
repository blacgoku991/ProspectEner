import { describe, expect, it } from "vitest";
import { withPlatformDefaults } from "./env";

describe("withPlatformDefaults", () => {
  it("déduit APP_URL du domaine de production Vercel", () => {
    expect(withPlatformDefaults({ VERCEL_PROJECT_PRODUCTION_URL: "exemple.vercel.app" }).APP_URL).toBe(
      "https://exemple.vercel.app",
    );
  });

  it("ne remplace jamais une valeur définie explicitement", () => {
    const out = withPlatformDefaults({
      APP_URL: "https://www.exemple.fr",
      VERCEL_PROJECT_PRODUCTION_URL: "exemple.vercel.app",
      DATABASE_URL: "postgresql://a",
      POSTGRES_URL: "postgresql://b",
    });
    expect(out.APP_URL).toBe("https://www.exemple.fr");
    expect(out.DATABASE_URL).toBe("postgresql://a");
  });

  it("utilise POSTGRES_URL quand DATABASE_URL est absente ou vide", () => {
    expect(withPlatformDefaults({ DATABASE_URL: "", POSTGRES_URL: "postgresql://b" }).DATABASE_URL).toBe("postgresql://b");
  });

  it("ne crée rien hors plateforme", () => {
    const out = withPlatformDefaults({});
    expect(out.APP_URL).toBeUndefined();
    expect(out.DATABASE_URL).toBeUndefined();
  });
});
