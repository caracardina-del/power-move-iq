import { MOVES, bySlug } from "@/content/moves/catalog";
import type { Move } from "@/content/moves/schema";

export type MoveSummary = Pick<
  Move,
  "id" | "number" | "slug" | "title" | "summary" | "category" | "situations" | "goals" | "channels" | "relationships" | "urgency" | "risk" | "access" | "principle"
> & { status: Move["editorial"]["status"]; searchText: string };

export function summarize(m: Move): MoveSummary {
  return {
    id: m.id, number: m.number, slug: m.slug, title: m.title, summary: m.summary, category: m.category,
    situations: m.situations, goals: m.goals, channels: m.channels, relationships: m.relationships,
    urgency: m.urgency, risk: m.risk, access: m.access, principle: m.principle, status: m.editorial.status,
    // Search index covers title, summary, principle, tags, example and opening line (scripts for free Moves only).
    searchText: [
      m.title, m.summary, m.principle, m.category, ...m.situations, ...m.goals, m.example, m.openingLine,
      ...(m.access === "free" ? Object.values(m.scripts) : []),
    ].join(" ").toLowerCase(),
  };
}

export const listSummaries = () => MOVES.filter((m) => m.editorial.status !== "archived").map(summarize);

/** Public preview of a Pro Move: framing only; execution guidance requires Pro. */
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

export const findBySlug = (slug: string) => bySlug.get(slug);
