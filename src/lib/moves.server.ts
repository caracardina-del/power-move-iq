import { MOVES, byId, bySlug, visibleMoves, isVisible, type CatalogMode } from "@/content/moves/catalog";
import type { Move } from "@/content/moves/schema";
import { catalogMode } from "./catalog-mode.server";

export type MoveSummary = Pick<
  Move,
  "id" | "number" | "slug" | "title" | "summary" | "category" | "situations" | "goals" | "channels" | "relationships" | "urgency" | "risk" | "access" | "principle"
> & { status: Move["editorial"]["status"]; reviewDraft: boolean; searchText: string };

export function summarize(m: Move): MoveSummary {
  return {
    id: m.id, number: m.number, slug: m.slug, title: m.title, summary: m.summary, category: m.category,
    situations: m.situations, goals: m.goals, channels: m.channels, relationships: m.relationships,
    urgency: m.urgency, risk: m.risk, access: m.access, principle: m.principle, status: m.editorial.status,
    reviewDraft: m.editorial.status !== "published",
    // Search covers title, summary, principle, tags, example and opening line (scripts only for free Moves).
    searchText: [
      m.title, m.summary, m.principle, m.category, ...m.situations, ...m.goals, m.example, m.openingLine,
      ...(m.access === "free" ? Object.values(m.scripts) : []),
    ].join(" ").toLowerCase(),
  };
}

export function listSummaries(mode: CatalogMode = catalogMode()) {
  return { mode, total: MOVES.length, moves: visibleMoves(mode).map(summarize) };
}

/** Public view: framing for all visible Moves; execution guidance only for free Moves. */
export function publicView(m: Move) {
  const base = {
    ...summarize(m),
    whyItWorks: m.whyItWorks, whenToUse: m.whenToUse, whenNotToUse: m.whenNotToUse, signals: m.signals,
    ethicalBoundary: m.ethicalBoundary, related: m.related, editorial: m.editorial,
  };
  if (m.access === "free") return { ...base, locked: false as const, full: fullPart(m) };
  return { ...base, locked: true as const, full: null };
}

export function fullPart(m: Move) {
  return {
    preparation: m.preparation, steps: m.steps, openingLine: m.openingLine, scripts: m.scripts,
    reactions: m.reactions, secondMove: m.secondMove, followUp: m.followUp, mistakes: m.mistakes,
    walkAway: m.walkAway, example: m.example,
  };
}

export function findVisibleBySlug(slug: string, mode: CatalogMode = catalogMode()) {
  const m = bySlug.get(slug);
  return m && isVisible(m, mode) ? m : undefined;
}
export function findVisibleById(id: string, mode: CatalogMode = catalogMode()) {
  const m = byId.get(id);
  return m && isVisible(m, mode) ? m : undefined;
}

/** Deterministic daily Move: same Move for everyone on a UTC date, cycling through the visible pool in number order. */
export function dailyMove(date = new Date(), mode: CatalogMode = catalogMode()) {
  const pool = visibleMoves(mode);
  if (!pool.length) return null;
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  return pool[day % pool.length]!;
}

/** Map the user-selected situation type to catalog situation tags for candidate selection. */
const TYPE_TO_SITUATIONS: Record<string, string[]> = {
  "Client negotiation": ["client_scope", "pricing", "follow_up", "commitment"],
  "Salary / career": ["compensation", "promotion", "offer"],
  Pricing: ["pricing", "client_scope", "vendor"],
  Boundary: ["boundary", "difficult_conversation"],
  "Difficult customer": ["difficult_conversation", "relationship_repair", "escalation", "client_scope"],
  "Offer / counteroffer": ["offer", "compensation", "walk_away"],
  Other: [],
};

/** Candidate Moves for AI grounding: tag-matched first, then the rest, capped. */
export function candidatesFor(type: string, goal: string | undefined, mode: CatalogMode = catalogMode(), cap = 24) {
  const pool = visibleMoves(mode);
  const sits = TYPE_TO_SITUATIONS[type] ?? [];
  const score = (m: Move) =>
    (m.situations as string[]).filter((s) => sits.includes(s)).length * 2 + (goal && (m.goals as string[]).includes(goal) ? 3 : 0);
  return [...pool].sort((a, b) => score(b) - score(a) || a.number - b.number).slice(0, cap);
}
