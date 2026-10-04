"use client";

import { ArrowRight, Droplets, Fan, Flame, CircleHelp, Layers, Sparkles, Wind } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WORK_CATEGORY_OPTIONS } from "@/engine/questionnaire";
import type { WorkCategory } from "@/engine/types";
import type { PublicConfig } from "@/lib/public-config";
import { worksTextForRequest } from "@/lib/requests/shared";
import { MultiChoice } from "./ChoiceCards";
import { Confirmation } from "./Confirmation";
import { ContactForm, type SubmitSuccess } from "./ContactForm";
import { LocationField, type LocationValue } from "./LocationField";

const ICONS = { ISOLATION: Layers, CHAUFFAGE: Flame, PAC: Fan, EAU_CHAUDE: Droplets, VENTILATION: Wind, RENOVATION_GLOBALE: Sparkles, AUTRE: CircleHelp };

/** Parcours court : localisation + type de projet + coordonnées, sans questionnaire ni résultat. */
export function QuickCallback({ config }: { config: PublicConfig }) {
  const [location, setLocation] = useState<LocationValue>({});
  const [works, setWorks] = useState<WorkCategory[]>([]);
  const [errors, setErrors] = useState<{ location?: string; works?: string }>({});
  const [done, setDone] = useState<SubmitSuccess | null>(null);

  if (done) return <Confirmation result={done} config={config} />;

  const validateExtra = () => {
    const next: typeof errors = {};
    if (!location.postalCode || !/^\d{5}$/.test(location.postalCode)) next.location = "Indiquez le code postal du logement.";
    if (works.length === 0) next.works = "Choisissez au moins un type de projet.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const answers = {
    postalCode: location.postalCode ?? "",
    ...(location.communeInsee ? { communeInsee: location.communeInsee } : {}),
    ...(location.communeName ? { communeName: location.communeName } : {}),
    works,
  };

  return (
    <div className="space-y-8">
      <section className="card space-y-6 p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-bold text-ink-900">1. Votre logement</h2>
          <div className="mt-4">
            <LocationField value={location} onChange={setLocation} />
          </div>
          {errors.location && <p className="field-error">{errors.location}</p>}
        </div>
        <div>
          <h2 className="text-xl font-bold text-ink-900">2. Votre projet</h2>
          <p className="mb-4 mt-1 text-sm text-ink-600">Plusieurs choix possibles.</p>
          <MultiChoice
            label="Type de projet"
            options={WORK_CATEGORY_OPTIONS.map((o) => ({ ...o, icon: ICONS[o.value] }))}
            values={works}
            onChange={setWorks}
          />
          {errors.works && <p className="field-error">{errors.works}</p>}
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="text-xl font-bold text-ink-900">3. Vos coordonnées</h2>
        <p className="mb-6 mt-1 text-sm text-ink-600">
          Sans questionnaire, aucun résultat de pré-éligibilité ne peut vous être indiqué : votre situation sera étudiée lors de l&apos;échange.
        </p>
        <ContactForm
          kind="QUICK_CALLBACK"
          config={config}
          answers={answers}
          locationLabel={[location.postalCode, location.communeName].filter(Boolean).join(" ") || "à indiquer ci-dessus"}
          worksText={worksTextForRequest("QUICK_CALLBACK", { works })}
          validateExtra={validateExtra}
          onSuccess={(r) => {
            setDone(r);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </section>

      <p className="text-center text-sm text-ink-600">
        Finalement, vous avez 3 minutes ?{" "}
        <Link href="/simulation" className="inline-flex items-center gap-1 font-semibold text-pine-700 underline">
          Faire le test d&apos;éligibilité <ArrowRight className="size-4" aria-hidden />
        </Link>
      </p>
    </div>
  );
}
