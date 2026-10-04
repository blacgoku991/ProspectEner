import "server-only";

/**
 * Journalisation applicative minimale : jamais de donnée personnelle, de réponse au
 * questionnaire ni de secret. Seuls des identifiants techniques et codes d'erreur sont émis.
 */
type Level = "info" | "warn" | "error";

const SAFE_KEYS = new Set(["requestId", "reference", "event", "code", "status", "attempts", "durationMs", "action", "count", "channel"]);

function sanitize(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SAFE_KEYS.has(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) out[k] = v;
  }
  return out;
}

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({ level, message, ...sanitize(meta), at: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};

/** Message d'erreur sûr (type uniquement), sans contenu potentiellement sensible. */
export function errorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return err instanceof Error ? err.name : "UnknownError";
}
