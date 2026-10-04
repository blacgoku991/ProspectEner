import { describe, expect, it } from "vitest";
import { passwordCore, passwordPolicyError } from "./password";

describe("politique de mot de passe", () => {
  it("accepte des phrases de passe et mots de passe robustes", () => {
    for (const ok of ["Correct-Horse-Battery-42", "Another-Strong-Passphrase-7", "vélo rouge sous la pluie de mars", "Tq8#v!Lr2@pZ"]) {
      expect(passwordPolicyError(ok, "jeanne.martin@example.fr"), ok).toBeNull();
    }
  });

  it("refuse les mots de passe courants, même allongés ou déguisés", () => {
    for (const weak of ["Password123!", "P@ssw0rd2026!", "Azertyuiop1?", "Motdepasse2026!", "Mot-de-passe-2026", "!Bonjour2024!", "Pa55word2026", "Qwertyuiop123"]) {
      expect(passwordPolicyError(weak), weak).toMatch(/trop courant/);
    }
  });

  it("refuse les mots de passe trop simples ou trop courts", () => {
    expect(passwordPolicyError("Court1!")).toMatch(/12 caractères/);
    expect(passwordPolicyError("toutenminuscules")).toBeNull(); // 16 caractères : phrase de passe acceptée
    expect(passwordPolicyError("toutenminuscul")).toMatch(/3 types/);
    expect(passwordPolicyError("ababababababababab")).toMatch(/trop simple/);
    expect(passwordPolicyError("1234567890123456")).toMatch(/trop simple/);
  });

  it("refuse un mot de passe contenant l'identifiant", () => {
    expect(passwordPolicyError("Jeanne.Martin-Velo-2026", "jeanne.martin@example.fr")).toMatch(/identifiant/);
  });

  it("isole la partie « mot » d'un mot de passe", () => {
    expect(passwordCore("P@ssw0rd2026!")).toBe("password");
    expect(passwordCore("Mot-de-passe-2026")).toBe("motdepasse");
    expect(passwordCore("Rénovation!")).toBe("renovation");
  });
});
