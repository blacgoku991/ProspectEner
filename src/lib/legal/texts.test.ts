import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, referralEnabled, type SiteSettings } from "../settings-schema";
import { buildContactNotice, buildRequestSentence, homeFaq, noticeParagraphs, PRIVACY_LINK_TEXT, requestSentencePreview } from "./texts";

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

  it("avec une entreprise partenaire : elle est nommée avant l'envoi, sans lui prêter de rôle", () => {
    expect(buildRequestSentence("Rénovation Exemple", "PHONE", "pompe à chaleur air/eau", "Chauffage Lyonnais, Lyon, RGE")).toBe(
      "Je demande à être contacté(e) par Rénovation Exemple et par l'entreprise partenaire Chauffage Lyonnais, Lyon, RGE, par téléphone, au sujet de mon projet de pompe à chaleur air/eau.",
    );
    expect(buildRequestSentence("Rénovation Exemple", "EMAIL", "isolation des murs", "Isolation Sud")).toBe(
      "Je demande à être contacté(e) par Rénovation Exemple et par l'entreprise partenaire Isolation Sud, par e-mail, au sujet de mon projet de isolation des murs.",
    );
    // La personne a parfois déjà choisi l'entreprise de ses travaux : l'entreprise partenaire n'est pas présentée comme celle qui les réalise.
    expect(buildRequestSentence("Rénovation Exemple", "PHONE", "isolation des murs", "Isolation Sud")).not.toMatch(/réalise/);
    expect(requestSentencePreview("Rénovation Exemple", "isolation des murs", "Isolation Sud")).toBe(
      "Je demande à être contacté(e) par Rénovation Exemple et par l'entreprise partenaire Isolation Sud, par [choisissez un canal ci-dessus], au sujet de mon projet de isolation des murs.",
    );
  });
});

describe("questions fréquentes de la page d'accueil", () => {
  const answer = (s: SiteSettings, q: RegExp) => homeFaq(s).find((f) => q.test(f.q))?.a ?? "";

  it("sans mise en relation : les réponses ne sont transmises à aucun partenaire", () => {
    const s = withActivity({ kinds: ["ACCOMPAGNEMENT"] });
    expect(answer(s, /Que deviennent mes réponses/)).toBe(
      "Tant que vous n'envoyez pas de demande, vos réponses restent dans votre navigateur. Si vous envoyez une demande, elles sont jointes à celle-ci et ne sont transmises à aucun partenaire.",
    );
    expect(homeFaq(s).some((f) => /rémunérées/.test(f.a))).toBe(false);
  });

  it("avec mise en relation : la transmission à l'entreprise partenaire et la rémunération sont annoncées, comme dans la notice", () => {
    const s = withActivity({ kinds: ["MISE_EN_RELATION"] });
    const faq = homeFaq(s);
    expect(faq.some((f) => /aucun partenaire/.test(f.a))).toBe(false);
    const answers = answer(s, /Que deviennent mes réponses/);
    expect(answers).toContain("Elles ne sont transmises qu'à l'entreprise partenaire nommée dans votre demande avant l'envoi");
    expect(answers).toContain("Ces mises en relation sont rémunérées par les entreprises partenaires.");
    expect(answer(s, /Puis-je annuler/)).toContain("nous l'informons de votre annulation");
    // Mêmes questions dans les deux cas (liste affichée et données structurées FAQPage).
    expect(faq.map((f) => f.q)).toEqual(homeFaq(BASE).map((f) => f.q));
  });
});
