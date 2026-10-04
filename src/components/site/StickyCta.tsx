"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Barre d'action fixée en bas de l'écran. Elle apparaît quand le bouton principal
 * (`triggerId`) n'est pas visible, et s'efface dès qu'un message France Rénov' ou le pied
 * de page arrive en bas de l'écran : elle ne masque jamais l'information obligatoire du service public.
 */
export function StickyCta({ triggerId, mobileOnly = false, children }: { triggerId: string; mobileOnly?: boolean; children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const trigger = document.getElementById(triggerId);
    if (!trigger) return;
    const passObserver = new IntersectionObserver(([entry]) => {
      if (entry) setHidden(!entry.isIntersecting);
    });
    passObserver.observe(trigger);

    // Bande basse de l'écran (15 %) : la barre s'efface si un élément protégé y entre.
    const inBand = new Set<Element>();
    const bandObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target);
          else inBand.delete(e.target);
        }
        setBlocked(inBand.size > 0);
      },
      { rootMargin: "-85% 0px 0px 0px" },
    );
    document.querySelectorAll("[data-france-renov-notice], footer").forEach((el) => bandObserver.observe(el));

    return () => {
      passObserver.disconnect();
      bandObserver.disconnect();
    };
  }, [triggerId]);

  const visible = hidden && !blocked;
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-ink-900/10 bg-white/95 shadow-[0_-8px_30px_rgba(10,20,15,0.08)] backdrop-blur transition duration-300",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
        mobileOnly && "sm:hidden",
      )}
    >
      <div className="container-page flex items-center gap-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}
