import { AlertTriangle, CircleAlert } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-ink-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-ink-900/[0.06] bg-white p-5 shadow-soft", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-sans text-base font-semibold tracking-normal text-ink-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Tuile de chiffre : libellé, valeur (sans-serif, chiffres proportionnels), précision optionnelle. */
export function StatTile({ label, value, hint, href, tone = "default" }: { label: string; value: number | string; hint?: string; href?: string; tone?: "default" | "warning" | "critical" }) {
  const body = (
    <div
      className={cn(
        "h-full rounded-2xl border bg-white p-5 shadow-soft transition",
        tone === "warning" && "border-amber-300",
        tone === "critical" && "border-red-300",
        tone === "default" && "border-ink-900/[0.06]",
        href && "hover:-translate-y-0.5 hover:shadow-lift",
      )}
    >
      <p className="flex items-center gap-1.5 text-sm text-ink-600">
        {tone === "warning" && <AlertTriangle className="size-4 text-amber-600" aria-hidden />}
        {tone === "critical" && <CircleAlert className="size-4 text-red-600" aria-hidden />}
        {label}
      </p>
      <p className="mt-2 font-sans text-4xl font-semibold tracking-tight text-ink-950">{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export interface BarDatum {
  label: string;
  value: number;
  href?: string;
}

/**
 * Barres horizontales à une seule série (une couleur pour toutes les barres) :
 * barres fines, extrémité arrondie, valeur en bout de barre, infobulle au survol et au focus.
 */
export function BarList({ data, emptyLabel = "Aucune donnée", total }: { data: BarDatum[]; emptyLabel?: string; total?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const sum = total ?? data.reduce((a, d) => a + d.value, 0);
  if (data.length === 0 || sum === 0) return <p className="text-sm text-ink-500">{emptyLabel}</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = sum ? Math.round((d.value / sum) * 100) : 0;
        const tip = `${d.value.toLocaleString("fr-FR")} · ${pct} % — ${d.label}`;
        const row = (
          <div className="group relative" tabIndex={d.href ? undefined : 0} aria-label={tip}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink-700">{d.label}</span>
              <span className="tabular-nums font-semibold text-ink-900">{d.value.toLocaleString("fr-FR")}</span>
            </div>
            <div className="h-3 rounded-r bg-transparent">
              <div className="h-3 rounded-r-[4px] bg-[#1f977c] transition group-hover:bg-[#147a65]" style={{ width: d.value === 0 ? "0%" : `${Math.max(2, (d.value / max) * 100)}%` }} />
            </div>
            <span
              role="tooltip"
              className="pointer-events-none absolute -top-8 right-0 z-10 hidden whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1 text-xs text-white shadow-lift group-hover:block group-focus-within:block group-focus:block"
            >
              <strong className="font-semibold">{d.value.toLocaleString("fr-FR")}</strong> · {pct} %
            </span>
          </div>
        );
        return <li key={d.label}>{d.href ? <Link href={d.href} className="block rounded-lg outline-offset-4" aria-label={tip}>{row}</Link> : row}</li>;
      })}
    </ul>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-ink-900/15 bg-white/60 px-5 py-8 text-center text-sm text-ink-500">{children}</p>;
}

export function Alert({ tone = "warning", children }: { tone?: "warning" | "critical" | "info" | "success"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "critical" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-950",
        tone === "critical" && "border-red-300 bg-red-50 text-red-900",
        tone === "info" && "border-sky-200 bg-[#eef7fb] text-ink-800",
        tone === "success" && "border-pine-200 bg-pine-50 text-pine-900",
      )}
    >
      {(tone === "warning" || tone === "critical") && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
