import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, referralEnabled, type SiteSettings } from "../settings-schema";
import { buildContactNotice, buildRequestSentence, noticeParagraphs, PRIVACY_LINK_TEXT } from "./texts";

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
    expect(notice).not.toContain("rémunérées");
    expect(notice).toContain("Durée de conservation (3 ans au plus)");
    expect(notice.endsWith(`${PRIVACY_LINK_TEXT}.`)).toBe(true);
    // L'adresse de l'entreprise figure dans la politique de confidentialité, pas sous le formulaire.
    expect(notice).not.toContain("69000 Lyon");
    expect(notice).not.toContain("entreprise partenaire");
  });

  it("avec mise en relation : transmission à l'entreprise nommée ou, sinon, avec l'accord de la personne, et rémunération annoncées", () => {
    const s = withActivity({ kinds: ["MISE_EN_RELATION"] });
    expect(referralEnabled(s)).toBe(true);
    const notice = buildContactNotice(s);
    expect(noticeParagraphs(notice)[1]).toBe(
      "Si votre demande nomme une entreprise partenaire, elle lui est transmise, à elle seule ; sinon, une entreprise ne la reçoit que si vous acceptez un rendez-vous avec elle, son nom vous étant indiqué avant. Ces mises en relation sont rémunérées par les entreprises partenaires. Vos coordonnées ne sont jamais transmises à d'autres entreprises, ni utilisées pour une newsletter ou d'autres sollicitations : vous pouvez annuler votre demande à tout moment.",
    );
    expect(noticeParagraphs(notice)).toHaveLength(3);
    expect(notice).not.toContain("jamais vendues");
  });

  it("sans mise en relation : texte inchangé, aucune entreprise partenaire", () => {
    const notice = buildContactNotice(withActivity({ kinds: ["ACCOMPAGNEMENT"] }));
    expect(noticeParagraphs(notice)[1]).toBe(
      "Elles ne sont jamais vendues, ni utilisées pour une newsletter ou d'autres sollicitations : vous pouvez annuler votre demande à tout moment.",
    );
    expect(notice).not.toContain("partenaire");
  });
});

describe("phrase de la demande de contact", () => {
  it("sans entreprise partenaire : seule l'entreprise qui édite le site est nommée", () => {
    const expected = "Je demande à être contacté(e) par Rénovation Exemple, par téléphone, au sujet de mon projet de pompe à chaleur air/eau.";
    expect(buildRequestSentence("Rénovation Exemple", "PHONE", "pompe à chaleur air/eau")).toBe(expected);
    expect(buildRequestSentence("Rénovation Exemple", "PHONE", "pompe à chaleur air/eau", null)).toBe(expected);
    expect(buildRequestSentence("Rénovation Exemple", "PHONE", "pompe à chaleur air/eau", "")).toBe(expected);
  });

  it("avec une entreprise partenaire : elle est nommée avant l'envoi, avec son rôle", () => {
    expect(buildRequestSentence("Rénovation Exemple", "PHONE", "pompe à chaleur air/eau", "Chauffage Lyonnais, Lyon, RGE")).toBe(
      "Je demande à être contacté(e) par Rénovation Exemple et par Chauffage Lyonnais, Lyon, RGE, l'entreprise qui réalise les travaux, par téléphone, au sujet de mon projet de pompe à chaleur air/eau.",
    );
    expect(buildRequestSentence("Rénovation Exemple", "EMAIL", "isolation des murs", "Isolation Sud")).toBe(
      "Je demande à être contacté(e) par Rénovation Exemple et par Isolation Sud, l'entreprise qui réalise les travaux, par e-mail, au sujet de mon projet de isolation des murs.",
    );
  });
});
