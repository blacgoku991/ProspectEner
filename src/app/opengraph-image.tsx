import { ImageResponse } from "next/og";
import { INDEPENDENCE_DISCLAIMER } from "@/lib/legal/texts";
import { brandNameOf } from "@/lib/seo";
import { siteSettings } from "@/lib/site-data";

/** Image de partage (Open Graph / réseaux sociaux), sans montant ni promesse d'éligibilité. */
export const alt = "Votre rénovation énergétique peut-elle être aidée ? Test d'éligibilité gratuit, résultat immédiat.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function OpenGraphImage() {
  let brand = brandNameOf("");
  try {
    brand = brandNameOf((await siteSettings()).company.name);
  } catch {
    // Base indisponible : image générique.
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#fbfaf7", padding: "64px 72px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 68, height: 68, borderRadius: 18, background: "#136253", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24">
              <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#fbfaf7" />
              <path d="M10 21v-6h4v6" fill="#ffb547" />
            </svg>
          </div>
          <div style={{ fontSize: 34, color: "#0c1b18" }}>{brand}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 76, color: "#07110f", lineHeight: 1.08, letterSpacing: -1.5 }}>
            <div style={{ display: "flex" }}>Votre rénovation énergétique</div>
            <div style={{ display: "flex" }}>
              peut-elle être<span style={{ color: "#136253", marginLeft: 20 }}>aidée ?</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 36, fontSize: 30, color: "#3c5a54" }}>
            {["Gratuit", "Résultat immédiat", "Sans inscription"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="28" height="28" viewBox="0 0 24 24">
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#147a65" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#5b736e" }}>{INDEPENDENCE_DISCLAIMER}</div>
      </div>
    ),
    size,
  );
}
