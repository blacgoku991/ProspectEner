import { LogOut, Menu } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { IdleGuard } from "@/components/admin/IdleGuard";
import { requireStaff } from "@/lib/auth/guards";
import { SESSION_IDLE_MS } from "@/lib/auth/session";
import { logoutAction } from "../(auth)/actions";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, settings } = await requireStaff();
  const isAdmin = user.role === "ADMIN";
  const brand = settings.company.name || "ProspectEner";
  const userBox = (
    <div className="rounded-2xl bg-white/5 p-3">
      <p className="truncate text-sm font-semibold text-white">{user.displayName}</p>
      <p className="truncate text-xs text-white/55">{isAdmin ? "Administrateur" : "Collaborateur"} · {user.email}</p>
      <form action={logoutAction} className="mt-2">
        <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white">
          <LogOut className="size-3.5" aria-hidden /> Se déconnecter
        </button>
      </form>
    </div>
  );
  return (
    <div className="min-h-dvh bg-sand-100 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden h-dvh flex-col justify-between gap-6 bg-ink-950 p-4 lg:sticky lg:top-0 lg:flex">
        <div className="space-y-6">
          <Link href="/admin" className="flex items-center gap-2.5 px-2 pt-2 font-display text-lg font-bold text-white">
            <span className="grid size-8 place-items-center rounded-lg bg-pine-600 text-sm">PE</span>
            <span className="truncate">{brand}</span>
          </Link>
          <AdminNav isAdmin={isAdmin} />
        </div>
        {userBox}
      </aside>

      <details className="group sticky top-0 z-30 bg-ink-950 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-display font-bold text-white">
          {brand}
          <Menu className="size-5" aria-label="Ouvrir le menu" />
        </summary>
        <div className="space-y-4 px-4 pb-4">
          <AdminNav isAdmin={isAdmin} />
          {userBox}
        </div>
      </details>

      <div className="min-w-0">
        {settings.company.name === "" && (
          <p className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 lg:px-8">
            Le formulaire public est fermé tant que l&apos;identité de l&apos;entreprise n&apos;est pas renseignée (Paramètres).
          </p>
        )}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </div>
      <IdleGuard idleMs={SESSION_IDLE_MS} />
    </div>
  );
}
