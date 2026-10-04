"use server";

import { requireStaff } from "@/lib/auth/guards";

/** Prolonge la session pendant une activité réelle dans l'interface (lecture, saisie d'une note…). */
export async function keepAliveAction(): Promise<void> {
  await requireStaff();
}
