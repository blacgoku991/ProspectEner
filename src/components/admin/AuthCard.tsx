import { Lock } from "lucide-react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-lift sm:p-9">
      <span className="grid size-12 place-items-center rounded-2xl bg-pine-700 text-white shadow-glow">
        <Lock className="size-5" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-ink-950">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-ink-600">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
