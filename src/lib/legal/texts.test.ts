import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, partnerList, referralEnabled, type SiteSettings } from "../settings-schema";
import { buildContactNotice, PRIVACY_LINK_TEXT } from "./texts";

const BASE: SiteSettings = {
  ...DEFAULT_SETTINGS,
  company: { ...DEFAULT_SETTINGS.company, name: "Rénovation Exemple", address: "1 rue de l'Exemple, 69000 Lyon" },
};

const withActivity = (activity: Partial<SiteSettings["activity"]>): SiteSettings => ({ ...BASE, activity: { ...BASE.activity, ...activity } });

describe("notice d'information sous le formulaire", () => {
  it("donne l'essentiel en quelques lignes et renvoie au détail", () => {
    const notice = buildContactNotice(withActivity({ kinds: ["TRAVAUX"] }));
    expect(notice).toContain("Rénovation Exemple utilise vos coordonnées et vos réponses uniquement pour répondre à votre demande");
    expect(notice).toContain("Elles ne sont jamais vendues, ni utilisées pour une newsletter ou d'autres sollicitations");
    expect(notice).toContain("Durée de conservation (3 ans au plus)");
    expect(notice.endsWith(`${PRIVACY_LINK_TEXT}.`)).toBe(true);
    // L'adresse de l'entreprise figure dans la politique de confidentialité, pas sous le formulaire.
    expect(notice).not.toContain("69000 Lyon");
    expect(notice).not.toContain("l'entreprise qui réalise les travaux");
  });

  it("avec mise en relation : la transmission à l'entreprise des travaux est annoncée", () => {
    const s = withActivity({ kinds: ["MISE_EN_RELATION"] });
    expect(referralEnabled(s)).toBe(true);
    expect(buildContactNotice(s)).toContain(
      "si vous acceptez un rendez-vous, l'entreprise qui réalise les travaux les reçoit, son nom vous étant indiqué avant.",
    );
  });

  it("liste des entreprises partenaires : une par ligne", () => {
    const s = withActivity({ kinds: ["MISE_EN_RELATION"], partners: "Chauffage Exemple, Lyon, RGE\n\n  Isolation Exemple, Villeurbanne, RGE  " });
    expect(partnerList(s)).toEqual(["Chauffage Exemple, Lyon, RGE", "Isolation Exemple, Villeurbanne, RGE"]);
  });
});
