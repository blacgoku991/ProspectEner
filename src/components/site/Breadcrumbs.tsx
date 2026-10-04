import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { absoluteUrl } from "@/lib/seo";
import { JsonLd } from "./JsonLd";

export interface Crumb {
  name: string;
  path: string;
}

/** Fil d'Ariane visible + balisage BreadcrumbList. Le dernier élément est la page courante. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <nav aria-label="Fil d'Ariane" className="text-sm text-ink-500">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((c, i) => (
            <li key={c.path} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 text-ink-300" aria-hidden />}
              {i < items.length - 1 ? (
                <Link href={c.path} className="hover:text-ink-900 hover:underline">
                  {c.name}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink-700">
                  {c.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
        }}
      />
    </>
  );
}
