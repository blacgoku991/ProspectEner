import { CalendarClock, PhoneCall } from "lucide-react";
import Link from "next/link";
import { TERRITORY_LABELS, WORK_CATEGORY_LABELS } from "@/engine";
import type { Territory, WorkCategory } from "@/engine/types";
import { SecurityOverview } from "@/components/admin/SecurityOverview";
import { Alert, BarList, Panel, PageHeader, StatTile } from "@/components/admin/ui";
import { buildRequestWhere, callbackState } from "@/lib/admin/requests";
import { requestScope, requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { FUNNEL_LABELS, FUNNEL_STEPS } from "@/lib/funnel";
import { OUTCOME_LABELS, STATUS_LABELS } from "@/lib/requests/shared";
import { getPublishedRuleSet } from "@/lib/rulesets";
import { notificationTransports } from "@/lib/settings";
import { launchChecklist } from "@/lib/settings-schema";

export const metadata = { title: "Tableau de bord" };

const dateTime = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default async function DashboardPage() {
  const ctx = await requireStaff();
  const { user, settings } = ctx;
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const since30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const scope = requestScope(user, settings);

  const [newCount, toProcess, soon, overdue, byOutcome, byStatus, byTerritory, worksRows, funnelRows, upcoming, failedNotifications, ruleSet, demoCount, pendingDraft] =
    await Promise.all([
      prisma.contactRequest.count({ where: { AND: [scope, { createdAt: { gte: since7 } }] } }),
      prisma.contactRequest.count({ where: { AND: [scope, { status: { in: ["NOUVEAU", "A_VERIFIER"] } }] } }),
      prisma.contactRequest.count({ where: buildRequestWhere({ deadline: "soon" }, user, settings, now) }),
      prisma.contactRequest.count({ where: buildRequestWhere({ deadline: "overdue" }, user, settings, now) }),
      prisma.contactRequest.groupBy({ by: ["overallOutcome"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
      prisma.contactRequest.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.contactRequest.groupBy({ by: ["territory"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
      prisma.$queryRaw<{ work: string; n: bigint }[]>`
        SELECT unnest("projectTypes") AS work, count(*) AS n FROM "ContactRequest"
        WHERE "createdAt" >= ${since30} GROUP BY work ORDER BY n DESC`,
      prisma.funnelDailyStat.groupBy({ by: ["step"], where: { day: { gte: since30 } }, _sum: { count: true } }),
      prisma.contactRequest.findMany({
        where: { AND: [scope, { channel: "PHONE", firstContactAt: null, status: { in: ["NOUVEAU", "A_VERIFIER"] }, callbackDeadline: { gte: now } }] },
        orderBy: { callbackDeadline: "asc" },
        take: 8,
        select: { id: true, reference: true, firstName: true, lastName: true, communeName: true, callbackDeadline: true, channel: true, firstContactAt: true, status: true },
      }),
      prisma.notification.count({ where: { status: "FAILED" } }),
      getPublishedRuleSet(),
      prisma.contactRequest.count({ where: { isDemo: true } }),
      // Nouvelle version embarquée ajoutée comme brouillon lors d'un déploiement.
      prisma.ruleSet.findFirst({ where: { status: "DRAFT", createdById: null }, orderBy: { createdAt: "desc" }, select: { id: true, version: true } }),
    ]);

  const checklist = launchChecklist(settings, notificationTransports());
  const blocking = checklist.filter((c) => !c.ok && c.blocking);
  const pendingChecks = checklist.filter((c) => !c.ok);
  const d = ruleSet.data.dispositifs;
  const validities = [d.MPR_GESTE, d.MPR_AMPLEUR, d.CEE, d.ECO_PTZ].filter((x) => x.enabled).map((x) => x.validUntil).filter((x): x is string => Boolean(x));
  const firstExpiry = validities.sort()[0];
  const expiresSoon = firstExpiry ? new Date(`${firstExpiry}T23:59:59Z`).getTime() - now.getTime() < 30 * 24 * 3600 * 1000 : false;

  const funnelMap = new Map(funnelRows.map((r) => [r.step, r._sum.count ?? 0]));

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle={`Bonjour ${user.displayName}. Situation au ${dateTime.format(now)}.`} />

      <div className="mb-6 space-y-3">
        {blocking.length > 0 && (
          <Alert tone="critical">
            <strong>Le formulaire public est fermé.</strong> À compléter : {blocking.map((b) => b.label.toLowerCase()).join(", ")}.{" "}
            {user.role === "ADMIN" && <Link className="font-semibold underline" href="/admin/parametres">Ouvrir les paramètres</Link>}
          </Alert>
        )}
        {blocking.length === 0 && pendingChecks.length > 0 && (
          <Alert>
            Check-list de mise en ligne : {pendingChecks.length} point(s) à traiter ({pendingChecks.map((c) => c.label.toLowerCase()).join(" ; ")}).
          </Alert>
        )}
        {overdue > 0 && (
          <Alert tone="critical">
            {overdue} demande(s) de rappel ont dépassé le délai de réponse : un appel n&apos;est plus couvert par la demande.{" "}
            <Link className="font-semibold underline" href="/admin/demandes?deadline=overdue">Voir</Link>
          </Alert>
        )}
        {demoCount > 0 && (
          <Alert>
            {demoCount} demande(s) de démonstration sont présentes : à supprimer avant la mise en production.{" "}
            <Link className="font-semibold underline" href="/admin/demandes?demo=1">Voir</Link>
          </Alert>
        )}
        {failedNotifications > 0 && (
          <Alert>
            {failedNotifications} notification(s) interne(s) en échec (les demandes sont bien enregistrées).{" "}
            {user.role === "ADMIN" && <Link className="font-semibold underline" href="/admin/parametres#notifications">Voir</Link>}
          </Alert>
        )}
        {pendingDraft && (
          <Alert>
            Une nouvelle version des règles ({pendingDraft.version}) est prête : prévisualisez-la, puis publiez-la si elle vous convient.{" "}
            {user.role === "ADMIN" && (
              <Link className="font-semibold underline" href={`/admin/baremes/${pendingDraft.id}`}>
                Prévisualiser
              </Link>
            )}
          </Alert>
        )}
        {expiresSoon && (
          <Alert>
            Les règles d&apos;au moins un dispositif arrivent en fin de validité ({firstExpiry}) : préparez et vérifiez un nouveau barème.{" "}
            <Link className="font-semibold underline" href="/admin/baremes">Barèmes</Link>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Nouvelles demandes (7 jours)" value={newCount} href="/admin/demandes?sort=recent" />
        <StatTile label="À traiter" value={toProcess} hint="Statuts « Nouveau » et « À vérifier »" href="/admin/demandes?open=1&sort=oldest" />
        <StatTile label="Rappels à échéance (≤ 2 jours)" value={soon} tone={soon > 0 ? "warning" : "default"} href="/admin/demandes?deadline=soon&sort=deadline" />
        <StatTile label="Délais de rappel dépassés" value={overdue} tone={overdue > 0 ? "critical" : "default"} href="/admin/demandes?deadline=overdue" />
      </div>

      {user.role === "ADMIN" && (
        <div className="mt-6">
          <SecurityOverview />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel
          title="Rappels à effectuer"
          actions={<Link href="/admin/demandes?deadline=soon&sort=deadline" className="text-sm font-semibold text-pine-700">Tout voir</Link>}
        >
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-500">Aucun rappel en attente.</p>
          ) : (
            <ul className="divide-y divide-ink-900/[0.06]">
              {upcoming.map((r) => {
                const cb = callbackState(r, settings, now);
                return (
                  <li key={r.id}>
                    <Link href={`/admin/demandes/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-sand-50">
                      <span className="flex min-w-0 items-center gap-3">
                        <PhoneCall className="size-4 shrink-0 text-ink-400" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-900">
                            {[r.firstName, r.lastName].filter(Boolean).join(" ") || "Contact anonymisé"}
                          </span>
                          <span className="block text-xs text-ink-500">
                            {r.reference} · {r.communeName ?? "—"}
                          </span>
                        </span>
                      </span>
                      <span className={cb.state === "SOON" ? "badge bg-amber-100 text-amber-900" : "badge bg-sand-100 text-ink-700"}>
                        <CalendarClock className="size-3.5" aria-hidden />
                        {r.callbackDeadline ? dateTime.format(r.callbackDeadline) : "—"}
                        {cb.remaining !== null && ` · ${cb.remaining} j. ouvr.`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Statuts de traitement">
          <BarList
            data={(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((s) => ({
              label: STATUS_LABELS[s],
              value: byStatus.find((x) => x.status === s)?._count._all ?? 0,
              href: `/admin/demandes?status=${s}`,
            }))}
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Types de travaux (30 jours)">
          <BarList
            data={worksRows.map((w) => ({
              label: WORK_CATEGORY_LABELS[w.work as WorkCategory] ?? w.work,
              value: Number(w.n),
              href: `/admin/demandes?work=${w.work}`,
            }))}
            total={worksRows.reduce((a, w) => a + Number(w.n), 0)}
          />
        </Panel>
        <Panel title="Territoires (30 jours)">
          <BarList
            data={byTerritory
              .map((t) => ({ label: TERRITORY_LABELS[t.territory as Territory] ?? t.territory, value: t._count._all, href: `/admin/demandes?territory=${t.territory}` }))
              .sort((a, b) => b.value - a.value)}
          />
        </Panel>
        <Panel title="Résultats indicatifs (30 jours)">
          <BarList
            data={(Object.keys(OUTCOME_LABELS) as (keyof typeof OUTCOME_LABELS)[]).map((o) => ({
              label: OUTCOME_LABELS[o],
              value: byOutcome.find((x) => x.overallOutcome === o)?._count._all ?? 0,
              href: `/admin/demandes?outcome=${o}`,
            }))}
          />
        </Panel>
      </div>

      <Panel title="Parcours des visiteurs (30 jours, statistiques agrégées sans identifiant)" className="mt-6">
        <BarList data={FUNNEL_STEPS.map((s) => ({ label: FUNNEL_LABELS[s], value: funnelMap.get(s) ?? 0 }))} total={funnelMap.get("landing") ?? undefined} />
        <p className="mt-4 text-xs text-ink-500">Pourcentages calculés par rapport aux visites de l&apos;accueil. Aucune réponse au questionnaire n&apos;est collectée dans ces statistiques.</p>
      </Panel>
    </>
  );
}
