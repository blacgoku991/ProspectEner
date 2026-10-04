import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, partnerList, referralEnabled, type SiteSettings } from "../settings-schema";
import { buildContactNotice } from "./texts";

const BASE: SiteSettings = {
  ...DEFAULT_SETTINGS,
  company: { ...DEFAULT_SETTINGS.company, name: "Rénovation Exemple", address: "1 rue de l'Exemple, 69000 Lyon" },
};

const withActivity = (activity: Partial<SiteSettings["activity"]>): SiteSettings => ({ ...BASE, activity: { ...BASE.activity, ...activity } });

describe("notice d'information et mise en relation", () => {
  it("sans mise en relation : aucune transmission à des partenaires", () => {
    const notice = buildContactNotice(withActivity({ kinds: ["TRAVAUX"] }));
    expect(notice).toContain("Vos données ne sont ni vendues, ni transmises à des partenaires.");
    expect(notice).not.toContain("l'entreprise qui réalise l'étude et les travaux reçoit");
  });

  it("avec mise en relation : la transmission est annoncée, limitée au rendez-vous accepté", () => {
    const s = withActivity({ kinds: ["MISE_EN_RELATION"] });
    expect(referralEnabled(s)).toBe(true);
    const notice = buildContactNotice(s);
    expect(notice).toContain("si vous l'acceptez, organiser votre rendez-vous avec l'entreprise qui réalise l'étude et les travaux");
    expect(notice).toContain("Si vous acceptez un rendez-vous, l'entreprise qui réalise l'étude et les travaux reçoit vos coordonnées et votre projet");
    expect(notice).toContain("son nom vous est indiqué avant.");
    expect(notice).toContain("Vos données ne sont jamais vendues ni transmises à d'autres entreprises.");
    expect(notice).not.toContain("ni transmises à des partenaires");
  });

  it("renvoie à la liste des entreprises partenaires lorsqu'elle est renseignée", () => {
    const s = withActivity({ kinds: ["MISE_EN_RELATION"], partners: "Chauffage Exemple, Lyon, RGE\n\n  Isolation Exemple, Villeurbanne, RGE  " });
    expect(partnerList(s)).toEqual(["Chauffage Exemple, Lyon, RGE", "Isolation Exemple, Villeurbanne, RGE"]);
    expect(buildContactNotice(s)).toContain("son nom vous est indiqué avant (voir la politique de confidentialité).");
  });
});
