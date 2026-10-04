/**
 * Choix de l'internaute sur les traceurs facultatifs (recommandations CNIL) : conservé 6 mois dans un
 * cookie propre au site, sans identifiant (exempté d'accord : il ne sert qu'à mémoriser ce choix), puis
 * redemandé. Le serveur le lit pour n'afficher le bandeau qu'aux visiteurs qui n'ont pas encore choisi.
 * Seul traceur concerné : l'origine de la visite (paramètres de campagne), lue et conservée après accord.
 */
export const CONSENT_COOKIE = "pe-consent";
export const CONSENT_EVENT = "pe-consent-change";
const MAX_AGE_S = 180 * 24 * 3600;

export interface Consent {
  acquisition: boolean;
  /** Date du choix (millisecondes). */
  at: number;
}

/** Valeur « 1.<0|1>.<date du choix en ms> » : version, accord pour l'origine des visites, date. */
export function serializeConsent(acquisition: boolean, now = Date.now()): string {
  return `1.${acquisition ? 1 : 0}.${now}`;
}

export function parseConsent(raw: string | null | undefined, now = Date.now()): Consent | null {
  const m = raw ? /^1\.([01])\.(\d{13})$/.exec(raw) : null;
  if (!m) return null;
  const at = Number(m[2]);
  if (now - at > MAX_AGE_S * 1000 || at - now > 60_000) return null;
  return { acquisition: m[1] === "1", at };
}

export function readConsentRaw(): string | null {
  try {
    const m = /(?:^|;\s*)pe-consent=([^;]*)/.exec(document.cookie);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

export function readConsent(): Consent | null {
  return parseConsent(readConsentRaw());
}

function setConsentCookie(value: string, maxAge: number): void {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // cookies bloqués : le bandeau réapparaîtra à la prochaine visite
  }
}

export function writeConsent(acquisition: boolean): void {
  setConsentCookie(serializeConsent(acquisition), MAX_AGE_S);
  if (!acquisition) {
    try {
      sessionStorage.removeItem("pe-acq");
    } catch {
      // stockage indisponible : rien n'a pu y être conservé
    }
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** Efface le choix : le bandeau est de nouveau proposé. */
export function clearConsent(): void {
  setConsentCookie("", 0);
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}
