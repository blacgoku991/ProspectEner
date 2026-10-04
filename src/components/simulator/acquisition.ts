/**
 * Paramètres de campagne (utm_source / utm_medium / utm_campaign) mémorisés pour la session,
 * uniquement s'ils ne contiennent aucune donnée personnelle. Aucun cookie, aucun identifiant publicitaire
 * (gclid, fbclid… sont ignorés).
 */
const KEY = "pe-acq";
const SAFE = /^[\w.\-+]{1,64}$/;
const looksPersonal = (v: string) => v.includes("@") || /\d{8,}/.test(v);

export interface Acquisition {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPath?: string;
  referrerHost?: string;
}

export function captureAcquisition(): void {
  try {
    if (sessionStorage.getItem(KEY)) return; // premier contact de la session conservé
    const params = new URLSearchParams(window.location.search);
    const pick = (name: string) => {
      const v = params.get(name);
      return v && SAFE.test(v) && !looksPersonal(v) ? v : undefined;
    };
    const acq: Acquisition = {
      utmSource: pick("utm_source"),
      utmMedium: pick("utm_medium"),
      utmCampaign: pick("utm_campaign"),
      landingPath: /^\/[\w\-/]*$/.test(window.location.pathname) ? window.location.pathname.slice(0, 200) : undefined,
    };
    if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host && host !== window.location.hostname && /^[a-z0-9.-]+$/i.test(host)) acq.referrerHost = host.slice(0, 200);
    }
    sessionStorage.setItem(KEY, JSON.stringify(acq));
  } catch {
    // stockage indisponible : aucune source enregistrée
  }
}

export function readAcquisition(): Acquisition | undefined {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Acquisition;
    const out: Acquisition = {};
    for (const k of ["utmSource", "utmMedium", "utmCampaign"] as const) {
      const v = parsed[k];
      if (typeof v === "string" && SAFE.test(v) && !looksPersonal(v)) out[k] = v;
    }
    if (typeof parsed.landingPath === "string" && /^\/[\w\-/]*$/.test(parsed.landingPath)) out.landingPath = parsed.landingPath.slice(0, 200);
    if (typeof parsed.referrerHost === "string" && /^[a-z0-9.-]+$/i.test(parsed.referrerHost)) out.referrerHost = parsed.referrerHost.slice(0, 200);
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}
