import { ArrowRight, BookOpenCheck, Check, ExternalLink, PhoneCall } from "lucide-react";
import Link from "next/link";
import type { SourceRef } from "@/engine/types";
import { cn } from "@/lib/cn";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

/** En-tête des pages d'information : fil d'Ariane, titre, chapeau. */
export function GuideHeader({ crumbs, kicker, title, lead, children }: { crumbs: Crumb[]; kicker?: string; title: string; lead: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="space-y-4">
      <Breadcrumbs items={crumbs} />
      {kicker && <p className="text-sm font-semibold uppercase tracking-wider text-pine-700">{kicker}</p>}
      <h1 className="text-3xl font-extrabold leading-tight text-ink-950 sm:text-[2.6rem]">{title}</h1>
      <div className="max-w-2xl text-lg leading-relaxed text-ink-600">{lead}</div>
      {children}
    </header>
  );
}

export function GuideSection({ id, title, children, className }: { id?: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-28 space-y-4", className)} aria-labelledby={id ? `${id}-titre` : undefined}>
      <h2 id={id ? `${id}-titre` : undefined} className="text-2xl font-bold text-ink-950">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((t) => (
        <li key={t} className="flex gap-3 leading-relaxed text-ink-700">
          <Check className="mt-1 size-4 shrink-0 text-pine-600" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function SourceList({ sources }: { sources: readonly SourceRef[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {sources.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 text-ink-700 underline decoration-ink-300 underline-offset-2 hover:text-ink-950">
            <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {s.label}
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Appel à l'action des pages d'information : le test, ou une demande de rappel. */
export function TestCta({ title = "Votre projet peut-il être aidé ?", text = "Répondez à quelques questions : le résultat s'affiche immédiatement, sans inscription." }: { title?: string; text?: string }) {
  return (
    <aside className="rounded-3xl bg-ink-900 px-6 py-8 text-white sm:px-10">
      <p className="text-2xl font-bold">{title}</p>
      <p className="mt-2 max-w-xl text-white/75">{text}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <Link href="/simulation" className="btn bg-white px-6 py-3.5 text-base text-ink-900 hover:bg-sand-100">
          Tester mon éligibilité
          <ArrowRight className="size-5" aria-hidden />
        </Link>
        <Link href="/rappel" className="inline-flex items-center gap-2 text-sm font-semibold text-white/85 underline underline-offset-4 hover:text-white">
          <PhoneCall className="size-4" aria-hidden />
          Être recontacté(e) sans faire le test
        </Link>
      </div>
    </aside>
  );
}

/** Rappel de la date et de la version des règles utilisées, avec lien vers la méthode. */
export function RulesFootnote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 text-sm leading-relaxed text-ink-500">
      <BookOpenCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {children}{" "}
        <Link href="/methodologie" className="font-medium text-ink-700 underline underline-offset-2 hover:text-ink-950">
          Méthode et sources
        </Link>
      </span>
    </p>
  );
}
