import { useId } from "react";
import { PALETTE } from "./palette";

/*
 * Illustration statique (SVG) affichée pendant le chargement de la scène 3D,
 * sans WebGL ou en cas d'erreur. Les tracés sont la projection exacte de la
 * maquette 3D (même cadrage), pour un fondu enchaîné sans saut.
 * Aucun style en ligne ni <style> : compatible avec une CSP stricte.
 */

const P = {
  shadow: "M429.2 310.7L424 324.1L414.9 337.4L401.8 350.3L384.7 362.2L363.9 372.9L339.6 382L312.4 389.1L283.1 393.9L252.5 396.2L221.5 396L191 393.2L162.1 387.9L135.4 380.4L111.8 370.9L91.7 360L75.4 347.8L63 334.9L54.7 321.5L50.2 308.1L49.3 294.8L51.8 282L57.3 269.8L65.5 258.4L76.1 247.8L88.7 238.2L103.1 229.7L118.9 222.1L135.9 215.7L154 210.4L172.8 206.1L192.1 202.9L211.9 200.9L231.9 199.9L252 200L272 201.2L291.7 203.5L311 206.9L329.6 211.3L347.5 216.9L364.3 223.5L379.9 231.2L393.9 240L406.2 249.8L416.3 260.5L424 272.1L428.9 284.4L430.8 297.4Z",
  islandSide: "M448.7 217.1L450.7 221.1L452.4 225.2L453.7 229.3L454.5 233.5L455 237.8L455 242.1L454.6 246.5L453.7 250.9L452.4 255.3L450.6 259.7L448.3 264.2L445.5 268.6L442.2 273L438.4 277.4L434 281.7L429.2 286L423.8 290.2L417.9 294.3L411.4 298.3L404.5 302.2L397.1 306L389.1 309.6L380.7 313L371.9 316.3L362.6 319.3L352.8 322.2L342.7 324.8L332.3 327.2L321.5 329.3L310.4 331.2L299.1 332.8L287.5 334.1L275.8 335.1L263.9 335.9L252 336.3L240 336.5L228 336.3L216.1 335.9L204.2 335.1L192.5 334.1L180.9 332.8L169.6 331.2L158.5 329.3L147.7 327.2L137.3 324.8L127.2 322.2L117.4 319.3L108.1 316.3L99.3 313L90.9 309.6L82.9 306L75.5 302.2L68.6 298.3L62.1 294.3L56.2 290.2L50.8 286L46 281.7L41.6 277.4L37.8 273L34.5 268.6L31.7 264.2L29.4 259.7L27.6 255.3L26.3 250.9L25.4 246.5L25 242.1L25 237.8L25.5 233.5L26.3 229.3L27.6 225.2L29.3 221.1L31.3 217.1L36.6 239.4L34.6 243.5L33.1 247.7L31.9 252L31.1 256.3L30.7 260.7L30.8 265.2L31.2 269.6L32.1 274.2L33.5 278.7L35.3 283.3L37.6 287.8L40.4 292.4L43.7 296.9L47.4 301.4L51.7 305.8L56.5 310.2L61.7 314.5L67.5 318.7L73.8 322.8L80.6 326.8L87.8 330.6L95.5 334.3L103.7 337.8L112.3 341.1L121.4 344.2L130.8 347.1L140.6 349.7L150.7 352.2L161.2 354.3L171.9 356.2L182.9 357.9L194.1 359.2L205.4 360.3L216.9 361L228.4 361.5L240 361.6L251.6 361.5L263.1 361L274.6 360.3L285.9 359.2L297.1 357.9L308.1 356.2L318.8 354.3L329.3 352.2L339.4 349.7L349.2 347.1L358.6 344.2L367.7 341.1L376.3 337.8L384.5 334.3L392.2 330.6L399.4 326.8L406.2 322.8L412.5 318.7L418.3 314.5L423.5 310.2L428.3 305.8L432.6 301.4L436.3 296.9L439.6 292.4L442.4 287.8L444.7 283.3L446.5 278.7L447.9 274.2L448.8 269.6L449.2 265.2L449.3 260.7L448.9 256.3L448.1 252L446.9 247.7L445.4 243.5L443.4 239.4Z",
  islandTop: "M454 250L451 258.8L446.1 267.7L439.2 276.5L430.2 285.1L419.1 293.5L406 301.4L390.8 308.8L373.7 315.6L354.9 321.6L334.5 326.7L312.7 330.8L289.9 333.8L266.4 335.7L242.5 336.5L218.5 336L194.9 334.3L171.9 331.5L150 327.6L129.2 322.7L110 316.9L92.6 310.3L77 303L63.4 295.2L51.9 286.9L42.5 278.3L35.1 269.5L29.8 260.7L26.5 251.8L25 243L25.3 234.4L27.3 226L30.8 217.9L35.7 210.1L42 202.7L49.4 195.7L57.8 189.1L67.3 182.9L77.5 177.2L88.6 171.9L100.3 167.1L112.6 162.8L125.4 158.9L138.6 155.4L152.2 152.4L166.1 149.9L180.3 147.8L194.7 146.2L209.2 145L223.8 144.3L238.5 144L253.2 144.2L267.8 144.8L282.3 145.9L296.7 147.5L311 149.4L324.9 151.9L338.6 154.8L351.9 158.1L364.8 161.9L377.2 166.2L389 170.9L400.2 176.1L410.7 181.7L420.3 187.8L429 194.3L436.6 201.2L443.1 208.6L448.3 216.3L452.1 224.3L454.4 232.6L455 241.2Z",
  trunks: "M107 179.6L110.2 179.6L108 151.2L104.8 151.2ZM69.1 200.7L72.3 200.7L70.5 182.8L67.3 182.8ZM386.5 189.7L389.7 189.7L393 150.1L389.8 150.1ZM417.3 228.5L420.5 228.5L423.6 199.1L420.4 199.1ZM388.5 286.2L391.7 286.2L393.4 267.6L390.2 267.6Z",
  deck: "M135.4 213.1L210.2 225L190.2 247.9L111.7 234.6Z",
  hpTop: "M85.5 166.8L124.5 172.4L132.4 166.2L93.9 160.8Z",
  hpFront: "M87.9 194.5L126.3 200.4L124.5 172.4L85.5 166.8Z",
  right: "M284.9 239.8L313 196.9L316.8 106.9L304.5 81.3L287.5 140.9Z",
  front: "M135.1 215.8L284.9 239.8L287.5 140.9L129.4 121.9Z",
  annexInside: "M309.9 199.5L367.1 207.6L371 155L312 147.8Z",
  annexFloor: "M288.8 231.4L350.7 241.1L367.1 207.6L309.9 199.5Z",
  tank: "M321.4 214.2L343.1 217.4L345.3 181.2L323.1 178.3Z",
  tankBand: "M322.1 192.5L344.2 195.6L344.3 193.7L322.2 190.7Z",
  annexRight: "M356.1 244.5L373 208.6L377.2 153.8L360.1 185.4Z",
  annexCut: "M350.4 243.8L355.9 244.7L360 185.6L354.3 184.8Z",
  annexRoof: "M290.6 171.3L365 181.2L382.5 148.5L314.5 140.4Z",
  annexRoofEdge: "M290.3 176.2L364.6 186.2L364.9 181.4L290.4 171.6Z",
  chimneySide: "M196.1 73.8L202.1 74.9L201.4 41.6L195.4 45.1Z",
  chimneyFront: "M181.6 72.4L196.1 73.8L195.4 45.1L180.7 43.9Z",
  chimneyCap: "M177.8 41L196.5 42.6L204.1 38.2L185.7 36.7Z",
  roofSide: "M313.5 75.9L291.6 154L292.4 156.8L314.1 79L314.2 75.2Z",
  roofFront: "M143 60L313.5 75.9L291.6 154L114.4 131.8Z",
  roofEdges: "M114.4 131.8L291.6 154M313.5 75.9L291.6 154M143 60L114.4 131.8",
  solar: "M148.6 75.3L171.7 77.6L164.8 96.1L141.4 93.6ZM173.5 77.7L197.1 80.1L190.4 98.8L166.5 96.3ZM198.9 80.3L223 82.7L216.6 101.7L192.2 99ZM224.9 82.8L249.5 85.3L243.4 104.5L218.4 101.9ZM140.7 95.3L164.1 97.9L157 116.9L133.4 114.2ZM165.9 98.1L189.8 100.7L182.9 119.9L158.8 117.1ZM191.6 100.9L216 103.5L209.4 123L184.7 120.2ZM217.8 103.7L242.8 106.4L236.4 126.2L211.2 123.3Z",
  vent: "M269.2 90.4L275.8 91.1L276.1 75L269.5 74.3Z",
  ventCap: "M265.2 73.8L278.4 75L275 67.2L272.8 67Z",
  sideWindow: "M299.9 154.9L306.2 146.9L306.9 127.6L300.6 135.2Z",
  frames: "M144.1 213.3L194.5 221.3L193.3 174.3L141.5 167.1ZM251.9 214.5L277.9 218.5L278.6 187.2L252.1 183.5ZM153.5 159.8L180 163.4L179.1 135.4L152.2 132ZM212.1 167.7L239.9 171.5L239.9 142.9L211.6 139.4ZM251.1 173L279.9 176.9L280.6 147.9L251.3 144.3Z",
  windows: "M146.1 211.5L192.2 218.8L191 176.3L143.8 169.7ZM254.3 212.7L275.5 215.9L276.1 189.2L254.5 186.2ZM155.6 157.8L177.7 160.8L176.9 137.4L154.5 134.7ZM214.4 165.7L237.5 168.8L237.5 145L214 142.1ZM253.6 171L277.5 174.2L278 150L253.8 147Z",
  doorFrame: "M213.5 224.1L239.4 228.2L239.4 180.7L212.7 177Z",
  door: "M215.7 223.5L237.1 226.8L237 182.7L215.1 179.7Z",
  canopy: "M205.6 169.2L247.5 174.9L239.6 183.7L196.7 177.7Z",
} as const;

/** Étages des sapins : [niveau, tracé]. */
const PINES: ReadonlyArray<readonly [number, string]> = [[0,"M103.8 116L134.8 164.6L80.2 157.1Z"],[1,"M102.7 101.9L127.4 142.5L84.1 136.9Z"],[2,"M101.2 81.4L119.6 121.8L88.9 118.1Z"],[0,"M66.8 160.9L86.8 191.5L52.4 186.2Z"],[1,"M65.9 152.2L81.8 177.6L54.7 173.6Z"],[2,"M64.7 139.6L76.6 164.7L57.5 162Z"],[0,"M393.8 244.7L412.9 277.5L369.9 270.3Z"],[1,"M394.7 235.6L409.5 262.8L375.6 257.3Z"],[2,"M395.9 222.4L405.7 249.1L381.6 245.4Z"]];
/** Cercles [cx, cy, r]. */
const ROUND_TREES: ReadonlyArray<readonly [number, number, number]> = [[392.3,140.3,32],[422.8,191.9,24.5]];
const BUSHES: ReadonlyArray<readonly [number, number, number]> = [[81.6,226.4,18.3],[91.5,244,13.1],[264.8,237.6,12.5],[247.9,277.9,11.6],[134.1,266.3,12.7],[349.5,294.3,14.8]];
const STONES: ReadonlyArray<readonly [number, number, number]> = [[216.8,244.6,10.7],[202.6,253.7,10.9],[200.4,265.4,11.2],[186.2,275.7,11.4],[182.2,288.6,11.7],[167.4,300.1,12]];
const FAN: readonly [number, number, number] = [99.4,182.9,9.8];
const PINE_TIERS = [PALETTE.pine700, PALETTE.pine600, PALETTE.pine500] as const;

export function HouseFallback({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { lawn: `${uid}-lawn`, soil: `${uid}-soil`, shadow: `${uid}-shadow`, roof: `${uid}-roof` };
  return (
    <svg viewBox="0 0 480 400" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={ids.shadow}>
          <stop offset="0" stopColor={PALETTE.ink900} stopOpacity="0.3" />
          <stop offset="0.6" stopColor={PALETTE.ink900} stopOpacity="0.14" />
          <stop offset="1" stopColor={PALETTE.ink900} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.lawn} cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#a9d6b6" />
          <stop offset="1" stopColor="#8ec49f" />
        </radialGradient>
        <linearGradient id={ids.soil} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6ddcb" />
          <stop offset="1" stopColor="#c9bb9f" />
        </linearGradient>
        <linearGradient id={ids.roof} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34564c" />
          <stop offset="1" stopColor="#264139" />
        </linearGradient>
      </defs>

      <path d={P.shadow} fill={`url(#${ids.shadow})`} />
      <path d={P.islandSide} fill={`url(#${ids.soil})`} />
      <path d={P.islandTop} fill={`url(#${ids.lawn})`} />

      {/* Arbres (troncs puis feuillages) */}
      <path d={P.trunks} fill={PALETTE.trunk} />
      {ROUND_TREES.map(([cx, cy, r], i) => (
        <g key={`r${i}`}>
          <circle cx={cx} cy={cy} r={r} fill={PALETTE.pine500} />
          <circle cx={cx - r * 0.25} cy={cy - r * 0.3} r={r * 0.55} fill={PALETTE.pine400} opacity="0.55" />
        </g>
      ))}
      {PINES.map(([tier, d], i) => (
        <path key={`p${i}`} d={d} fill={PINE_TIERS[tier] ?? PINE_TIERS[0]} />
      ))}

      {/* Terrasse, pas japonais, pompe à chaleur */}
      <path d={P.deck} fill={PALETTE.deck} />
      {STONES.map(([cx, cy, r], i) => (
        <ellipse key={`s${i}`} cx={cx} cy={cy} rx={r * 1.15} ry={r * 0.5} fill={PALETTE.stone} />
      ))}
      <path d={P.hpTop} fill="#dfe3de" />
      <path d={P.hpFront} fill={PALETTE.hpCasing} />
      <circle cx={FAN[0]} cy={FAN[1]} r={FAN[2]} fill={PALETTE.hpDark} stroke={PALETTE.ember} strokeWidth="1.2" />
      <circle cx={FAN[0]} cy={FAN[1]} r={FAN[2] * 0.55} fill="none" stroke={PALETTE.hpCasing} strokeWidth="0.6" />

      {/* Maison */}
      <path d={P.right} fill="#e4dccb" />
      <path d={P.front} fill="#f4f0e7" />
      <path d={P.annexInside} fill="#f2e2c2" />
      <path d={P.annexFloor} fill="#e3d8c5" />
      <path d={P.tank} fill={PALETTE.tank} />
      <path d={P.tankBand} fill={PALETTE.amber} />
      <path d={P.annexRight} fill="#e4dccb" />
      <path d={P.annexCut} fill={PALETTE.pine600} />
      <path d={P.annexRoof} fill={PALETTE.roof} />
      <path d={P.annexRoofEdge} fill={PALETTE.pine600} />
      <path d={P.chimneySide} fill="#b9603a" />
      <path d={P.chimneyFront} fill={PALETTE.chimney} />
      <path d={P.chimneyCap} fill={PALETTE.roof} />
      <path d={P.roofSide} fill="#1b302a" />
      <path d={P.roofFront} fill={`url(#${ids.roof})`} />
      <path d={P.roofEdges} fill="none" stroke={PALETTE.roofEdge} strokeWidth="2.2" strokeLinecap="round" />
      <path d={P.solar} fill="#16243b" stroke="#7e93ad" strokeWidth="0.5" strokeLinejoin="round" />
      <path d={P.vent} fill={PALETTE.metal} />
      <path d={P.ventCap} fill="#aab6b1" />
      <path d={P.sideWindow} fill="#ffc768" stroke={PALETTE.frame} strokeWidth="1.2" />
      <path d={P.frames} fill={PALETTE.frame} />
      <path d={P.windows} fill="#ffc768" />
      <path d={P.doorFrame} fill={PALETTE.frame} />
      <path d={P.door} fill={PALETTE.pine600} />
      <path d={P.canopy} fill={PALETTE.roof} />

      {BUSHES.map(([cx, cy, r], i) => (
        <g key={`b${i}`}>
          <circle cx={cx} cy={cy} r={r} fill={PALETTE.pine500} />
          <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.45} fill={PALETTE.pine400} opacity="0.5" />
        </g>
      ))}
    </svg>
  );
}
