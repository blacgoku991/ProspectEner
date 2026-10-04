import { ImageResponse } from "next/og";

/** Icône d'écran d'accueil (iOS), même dessin que l'icône du site. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#136253" }}>
        <svg width="112" height="112" viewBox="0 0 24 24">
          <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#fbfaf7" />
          <path d="M10 21v-6h4v6" fill="#ffb547" />
        </svg>
      </div>
    ),
    size,
  );
}
