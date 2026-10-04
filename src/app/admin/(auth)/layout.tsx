import type { Metadata } from "next";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink-950 px-4 py-10">
      <div aria-hidden className="absolute -left-32 -top-32 size-[480px] rounded-full bg-pine-600/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-40 -right-24 size-[420px] rounded-full bg-ember-500/15 blur-3xl" />
      <main className="relative w-full max-w-md">{children}</main>
    </div>
  );
}
