import { KeyRound, Lock, ShieldAlert, ShieldCheck, UserX } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/cn";
import { Panel } from "./ui";

/** Synthèse de sécurité pour les administrateurs : tentatives refusées, verrouillages, comptes sans MFA. */
export async function SecurityOverview() {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const [events, lockedAccounts, withoutMfa, activeSessions] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ["action"],
      where: { createdAt: { gte: since }, action: { in: ["AUTH_LOGIN_FAILURE", "AUTH_MFA_FAILURE", "AUTH_LOCKED", "ACCESS_DENIED"] } },
      _count: { _all: true },
    }),
    prisma.staffUser.count({ where: { isActive: true, lockedUntil: { gt: now } } }),
    prisma.staffUser.findMany({ where: { isActive: true, mfaEnabledAt: null, passwordHash: { not: null } }, select: { id: true, displayName: true } }),
    prisma.staffSession.count({ where: { revokedAt: null, expiresAt: { gt: now }, mfaVerifiedAt: { not: null } } }),
  ]);
  const count = (action: string) => events.find((e) => e.action === action)?._count._all ?? 0;
  const rows = [
    { icon: KeyRound, label: "Échecs de connexion", value: count("AUTH_LOGIN_FAILURE"), href: "/admin/journal?action=AUTH_LOGIN_FAILURE", alert: count("AUTH_LOGIN_FAILURE") >= 20 },
    { icon: ShieldAlert, label: "Codes de second facteur refusés", value: count("AUTH_MFA_FAILURE"), href: "/admin/journal?action=AUTH_MFA_FAILURE", alert: count("AUTH_MFA_FAILURE") >= 5 },
    { icon: Lock, label: "Verrouillages et limitations", value: count("AUTH_LOCKED"), href: "/admin/journal?action=AUTH_LOCKED", alert: count("AUTH_LOCKED") > 0 },
    { icon: UserX, label: "Accès refusés", value: count("ACCESS_DENIED"), href: "/admin/journal?action=ACCESS_DENIED", alert: count("ACCESS_DENIED") > 0 },
  ];
  return (
    <Panel title="Sécurité (7 derniers jours)" actions={<Link href="/admin/journal" className="text-sm font-semibold text-pine-700">Journal</Link>}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ icon: Icon, label, value, href, alert }) => (
          <li key={label}>
            <Link href={href} className={cn("flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-sand-50", alert && "bg-amber-50 ring-1 ring-inset ring-amber-600/20")}>
              <span className="flex items-center gap-2 text-ink-700">
                <Icon className={cn("size-4", alert ? "text-amber-700" : "text-ink-400")} aria-hidden />
                {label}
              </span>
              <span className="font-semibold tabular-nums text-ink-900">{value}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-1.5 border-t border-ink-900/[0.06] pt-4 text-sm text-ink-600">
        <p className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-pine-600" aria-hidden />
          {activeSessions} session(s) authentifiée(s) en cours · {lockedAccounts} compte(s) verrouillé(s) en ce moment
        </p>
        {withoutMfa.length > 0 && (
          <p className="flex items-center gap-2 text-amber-900">
            <ShieldAlert className="size-4 text-amber-700" aria-hidden />
            Sans double authentification : {withoutMfa.map((u) => u.displayName).join(", ")}.{" "}
            <Link href="/admin/equipe" className="font-semibold underline">
              Équipe
            </Link>
          </p>
        )}
      </div>
    </Panel>
  );
}
