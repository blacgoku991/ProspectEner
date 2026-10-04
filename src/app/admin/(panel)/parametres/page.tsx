import { CheckCircle2, CircleAlert } from "lucide-react";
import { Panel, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { retentionPreview } from "@/lib/retention";
import { notificationTransports } from "@/lib/settings";
import { launchChecklist } from "@/lib/settings-schema";
import { ActivityForm, CompanyForm, ContactForm, LaunchForm, NotificationsForm, RetentionForm, SecurityForm } from "./SettingsForms";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const { settings } = await requireAdmin();
  const transports = notificationTransports();
  const [preview, failed] = await Promise.all([
    retentionPreview(settings),
    prisma.notification.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 10, include: { request: { select: { reference: true } } } }),
  ]);
  const checklist = launchChecklist(settings, transports);
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Réservé aux administrateurs. Chaque modification est journalisée." />
      <div className="space-y-6">
        <Panel title="Check-list de mise en ligne">
          <ul className="space-y-2">
            {checklist.map((c) => (
              <li key={c.id} className="flex gap-2.5 text-sm">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-pine-600" aria-hidden /> : <CircleAlert className={c.blocking ? "mt-0.5 size-4.5 shrink-0 text-red-600" : "mt-0.5 size-4.5 shrink-0 text-amber-600"} aria-hidden />}
                <span>
                  <span className="font-medium text-ink-900">{c.label}</span>
                  <span className="sr-only">{c.ok ? " : fait" : c.blocking ? " : bloquant" : " : à traiter"}</span>
                  {!c.ok && <span className="block text-ink-600">{c.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-ink-900/[0.06] pt-4">
            <LaunchForm s={settings} />
          </div>
        </Panel>
        <Panel title="Identité de l'entreprise et mentions légales"><CompanyForm s={settings} /></Panel>
        <Panel title="Activité présentée sur le site"><ActivityForm s={settings} /></Panel>
        <Panel title="Demandes de rendez-vous et canaux de réponse"><ContactForm s={settings} /></Panel>
        <section id="notifications" className="scroll-mt-24">
          <Panel title="Notifications internes">
            <NotificationsForm s={settings} transports={transports} />
            {failed.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-ink-700">
                {failed.map((n) => (
                  <li key={n.id}>
                    {n.request?.reference ?? "—"} · {n.channel} · {n.attempts} tentative(s) · {n.lastError}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>
        <Panel title="Conservation des données"><RetentionForm s={settings} preview={preview} /></Panel>
        <Panel title="Sécurité et acquisition"><SecurityForm s={settings} /></Panel>
      </div>
    </>
  );
}
