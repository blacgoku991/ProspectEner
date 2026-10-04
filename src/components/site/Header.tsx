import Link from "next/link";
import { INDEPENDENCE_DISCLAIMER } from "@/lib/legal/texts";

export function Header({ brandName }: { brandName: string }) {
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-ink-900 text-center text-[13px] font-medium text-white/90">
        <p className="container-page py-2">{INDEPENDENCE_DISCLAIMER}</p>
      </div>
      <div className="border-b border-ink-900/[0.06] bg-sand-50/80 backdrop-blur-xl">
        <nav className="container-page flex h-16 items-center justify-between gap-4" aria-label="Navigation principale">
          <Link href="/" className="group flex items-center gap-2.5 font-display text-lg font-bold text-ink-900">
            <span className="grid size-9 place-items-center rounded-xl bg-pine-700 text-sand-50 shadow-glow transition group-hover:rotate-[-6deg]">
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="currentColor" />
                <path d="M10 21v-6h4v6" fill="#ffb547" />
              </svg>
            </span>
            <span className="max-w-[46vw] truncate">{brandName}</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/#fonctionnement" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-900/5 md:inline-flex">
              Fonctionnement
            </Link>
            <Link href="/#aides" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-900/5 md:inline-flex">
              Aides évaluées
            </Link>
            <Link href="/methodologie" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-900/5 lg:inline-flex">
              Méthode
            </Link>
            <Link href="/simulation" className="btn-primary px-4 py-2.5">
              Faire le test
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
