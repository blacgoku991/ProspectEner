"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { idleLogoutAction } from "@/app/admin/(auth)/actions";
import { keepAliveAction } from "@/app/admin/(panel)/session-actions";

const WARNING_MS = 60_000;
const PING_EVERY_MS = 5 * 60_000;
const SHARED_KEY = "pe_admin_activity";

function sharedActivity(): number {
  try {
    return Number(window.localStorage.getItem(SHARED_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Déconnexion automatique après `idleMs` sans activité (tous onglets confondus) : un écran laissé
 * ouvert n'affiche pas indéfiniment des données personnelles. Une activité réelle prolonge la session.
 */
export function IdleGuard({ idleMs }: { idleMs: number }) {
  const router = useRouter();
  const lastActivity = useRef(0);
  const lastPing = useRef(0);
  const lastShared = useRef(0);
  const loggingOut = useRef(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const markActive = useCallback((forcePing = false) => {
    const now = Date.now();
    lastActivity.current = now;
    if (now - lastShared.current > 15_000) {
      lastShared.current = now;
      try {
        window.localStorage.setItem(SHARED_KEY, String(now));
      } catch {
        // Stockage indisponible : chaque onglet compte sa propre activité.
      }
    }
    if (forcePing || now - lastPing.current > PING_EVERY_MS) {
      lastPing.current = now;
      keepAliveAction().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    lastActivity.current = now;
    lastPing.current = now;
    const onActivity = () => markActive();
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "wheel", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, onActivity, { passive: true });
    const timer = window.setInterval(() => {
      const idle = Date.now() - Math.max(lastActivity.current, sharedActivity());
      if (idle >= idleMs) {
        if (!loggingOut.current) {
          loggingOut.current = true;
          idleLogoutAction().catch(() => router.replace("/admin/connexion?inactif=1"));
        }
        return;
      }
      const left = idleMs - idle;
      setRemaining(left <= WARNING_MS ? left : null);
    }, 1000);
    return () => {
      for (const e of events) window.removeEventListener(e, onActivity);
      window.clearInterval(timer);
    };
  }, [idleMs, markActive, router]);

  if (remaining === null) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[min(92vw,34rem)] items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-sm text-white shadow-lift">
      <Clock className="size-5 shrink-0 text-amber-glow" aria-hidden />
      <p className="flex-1">Déconnexion automatique dans {Math.ceil(remaining / 1000)} s, faute d&apos;activité.</p>
      <button type="button" onClick={() => markActive(true)} className="rounded-full bg-white px-3.5 py-1.5 font-semibold text-ink-900 hover:bg-sand-100">
        Rester connecté(e)
      </button>
    </div>
  );
}
