import type { LimitedAnalysis } from "./moveiq-schema";
import type { SITUATION_TYPES, URGENCIES } from "./moveiq-schema";

/** Device-local storage only. Scenario text never goes into URLs or analytics. */
const DRAFT_KEY = "pmiq:draft";
const GUEST_KEY = "pmiq:guest-result";

export type Draft = {
  situation: string;
  type: (typeof SITUATION_TYPES)[number];
  urgency: (typeof URGENCIES)[number];
  updatedAt: number;
};

export type GuestResult = {
  token: string;
  situation: string;
  type: string;
  urgency: string;
  analysis: LimitedAnalysis;
  createdAt: number;
};

function read<T>(k: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function readDraft() {
  const d = read<Draft>(DRAFT_KEY);
  // Legacy home-page draft: only used if it is newer than the stored draft.
  const legacy = typeof window !== "undefined" ? window.sessionStorage.getItem("pmiq:home-draft") : null;
  if (legacy) {
    window.sessionStorage.removeItem("pmiq:home-draft");
    if (!d || !d.situation.trim())
      return { situation: legacy, type: "Other", urgency: "Exploring options", updatedAt: Date.now() } as Draft;
  }
  return d;
}
export function writeDraft(d: Omit<Draft, "updatedAt">) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, updatedAt: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}
export function clearDraft() {
  window.localStorage.removeItem(DRAFT_KEY);
}

export const readGuest = () => read<GuestResult>(GUEST_KEY);
export function writeGuest(g: GuestResult) {
  window.localStorage.setItem(GUEST_KEY, JSON.stringify(g));
}
export function clearGuest() {
  window.localStorage.removeItem(GUEST_KEY);
}
