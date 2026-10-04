import "server-only";
import { sha256Hex } from "../crypto";
import type { SiteSettings } from "../settings-schema";
import { buildContactNotice } from "./texts";

export interface NoticeWithHash {
  text: string;
  hash: string;
}

/** Notice d'information exacte et son empreinte (preuve du texte présenté). */
export function noticeWithHash(settings: SiteSettings): NoticeWithHash {
  const text = buildContactNotice(settings);
  return { text, hash: sha256Hex(text) };
}
