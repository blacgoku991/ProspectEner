import { describe, expect, it, vi } from "vitest";
import { isPasswordBreached } from "./password-check";

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const PREFIX = "5BAA6";
const SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

const respond = (body: string, ok = true) => vi.fn(async () => new Response(body, { status: ok ? 200 : 503 }));

describe("vérification des mots de passe divulgués (k-anonymat)", () => {
  it("ne transmet que les 5 premiers caractères de l'empreinte", async () => {
    const fetchImpl = respond(`${SUFFIX}:9545824\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0`);
    await isPasswordBreached("password", { fetchImpl, enabled: true });
    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]![0]).toBe(`https://api.pwnedpasswords.com/range/${PREFIX}`);
    // Ni le mot de passe, ni la fin de son empreinte dans les en-têtes ou le corps de la requête.
    expect(JSON.stringify(calls[0]![1])).not.toContain("password");
    expect(JSON.stringify(calls[0])).not.toContain(SUFFIX);
  });

  it("détecte un mot de passe divulgué, ignore les entrées de remplissage", async () => {
    expect(await isPasswordBreached("password", { fetchImpl: respond(`${SUFFIX}:9545824`), enabled: true })).toBe(true);
    expect(await isPasswordBreached("password", { fetchImpl: respond(`${SUFFIX}:0`), enabled: true })).toBe(false);
    expect(await isPasswordBreached("password", { fetchImpl: respond("0018A45C4D1DEF81644B54AB7F969B88D65:1"), enabled: true })).toBe(false);
  });

  it("ne bloque pas si le service est indisponible ou désactivé", async () => {
    expect(await isPasswordBreached("password", { fetchImpl: respond("", false), enabled: true })).toBeNull();
    const failing = vi.fn(async () => {
      throw new Error("réseau");
    });
    expect(await isPasswordBreached("password", { fetchImpl: failing, enabled: true })).toBeNull();
    const unused = respond(`${SUFFIX}:1`);
    expect(await isPasswordBreached("password", { fetchImpl: unused, enabled: false })).toBeNull();
    expect(unused).not.toHaveBeenCalled();
  });
});
