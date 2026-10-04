"use client";

import { FileSpreadsheet, Inbox, LayoutDashboard, Megaphone, ScrollText, Settings, ShieldBan, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, admin: false },
  { href: "/admin/demandes", label: "Demandes", icon: Inbox, admin: false },
  { href: "/admin/baremes", label: "Barèmes & règles", icon: FileSpreadsheet, admin: false },
  { href: "/admin/oppositions", label: "Oppositions", icon: ShieldBan, admin: false },
  { href: "/admin/acquisition", label: "Acquisition", icon: Megaphone, admin: true },
  { href: "/admin/journal", label: "Journal d'audit", icon: ScrollText, admin: true },
  { href: "/admin/equipe", label: "Équipe", icon: Users, admin: true },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings, admin: true },
  { href: "/admin/compte", label: "Mon compte", icon: UserCog, admin: false },
];

export function AdminNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="space-y-1">
      {ITEMS.filter((i) => isAdmin || !i.admin).map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-4.5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
