import { TriangleAlert } from "lucide-react";

export function LegalPage({ title, updated, children, missing }: { title: string; updated?: string; children: React.ReactNode; missing?: string[] }) {
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-bold text-ink-950 sm:text-4xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-ink-500">{updated}</p>}
      {missing && missing.length > 0 && (
        <p className="mt-6 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Certaines informations obligatoires ne sont pas encore renseignées par l&apos;éditeur du site : {missing.join(", ")}.
          </span>
        </p>
      )}
      <div className="prose-legal mt-8">{children}</div>
    </div>
  );
}

export function Field({ value }: { value: string }) {
  return value ? <>{value}</> : <em className="text-ink-400">information à compléter par l&apos;éditeur</em>;
}
