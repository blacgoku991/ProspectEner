"use client";

import { useEffect, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Origine du site (vide pendant le rendu serveur). */
export function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
}

const captured = new Map<string, string>();

function captureHash(): string {
  const key = window.location.pathname;
  const current = window.location.hash.slice(1);
  if (current) captured.set(key, current);
  return captured.get(key) ?? "";
}

/**
 * Paramètres du fragment d'URL (#ref=…&t=…), lus une seule fois puis retirés de la barre
 * d'adresse : un jeton placé dans le fragment n'est jamais transmis au serveur ni journalisé.
 */
export function useHashParams(): URLSearchParams {
  const raw = useSyncExternalStore(noopSubscribe, captureHash, () => "");
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  return new URLSearchParams(raw);
}
