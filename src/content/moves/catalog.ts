/**
 * Canonical Move catalog — the single source of Move truth.
 * Full records are server-only in practice: import this file only from *.server.ts
 * modules and validation scripts so Pro guidance is not shipped to the browser.
 */
import { moveSchema, type Move } from "./schema";
import { CATEGORIES, CATEGORY_IDS, MOVES_PER_CATEGORY, TOTAL_MOVES } from "./taxonomy";
import { FRAMING } from "./batch-01-framing";
import { INFORMATION } from "./batch-02-information";
import { DECISION } from "./batch-03-decision";
import { LEVERAGE } from "./batch-04-leverage";
import { POSITIONING } from "./batch-05-positioning";
import { PRICING } from "./batch-06-pricing";
import { SCOPE } from "./batch-07-scope";
import { TIMING } from "./batch-08-timing";
import { BOUNDARIES } from "./batch-09-boundaries";
import { TRADES } from "./batch-10-trades";
import { COMMITMENT } from "./batch-11-commitment";
import { ACCOUNTABILITY } from "./batch-12-accountability";
import { REPAIR } from "./batch-13-repair";
import { ESCALATION } from "./batch-14-escalation";
import { EXIT } from "./batch-15-exit";

const RAW = [
  ...FRAMING, ...INFORMATION, ...DECISION, ...LEVERAGE, ...POSITIONING, ...PRICING, ...SCOPE, ...TIMING,
  ...BOUNDARIES, ...TRADES, ...COMMITMENT, ...ACCOUNTABILITY, ...REPAIR, ...ESCALATION, ...EXIT,
];

export const MOVES: Move[] = RAW.map((m) => moveSchema.parse(m)).sort((a, b) => a.number - b.number);

export const byId = new Map(MOVES.map((m) => [m.id, m]));
export const bySlug = new Map(MOVES.map((m) => [m.slug, m]));

/**
 * Governance. Production shows and recommends ONLY `published` Moves.
 * Editorial preview (unpublished preview hosts only) additionally shows `in_review`
 * Moves, always labelled "Review draft". Draft, retired and archived never surface.
 */
export type CatalogMode = "production" | "editorial_preview";
export const isVisible = (m: Move, mode: CatalogMode) =>
  m.editorial.status === "published" || (mode === "editorial_preview" && m.editorial.status === "in_review");
export const visibleMoves = (mode: CatalogMode) => MOVES.filter((m) => isVisible(m, mode));
/** Back-compat alias: production-safe recommendation pool. */
export const recommendable = (mode: CatalogMode = "production") => visibleMoves(mode);

export type ValidationIssue = { level: "error" | "pending"; id: string; message: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const words = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 2));
const jaccard = (a: Set<string>, b: Set<string>) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  return inter / (a.size + b.size - inter || 1);
};

/** Editorial validation and duplicate detection (audit items 11, 12, 129). */
export function validateCatalog(moves: Move[] = MOVES): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = (key: string, pick: (m: Move) => string, label: string) => {
    const map = new Map<string, string>();
    for (const m of moves) {
      const v = norm(pick(m));
      const prev = map.get(v);
      if (prev) issues.push({ level: "error", id: m.id, message: `Duplicate ${label} with ${prev}` });
      else map.set(v, m.id);
    }
    void key;
  };
  seen("id", (m) => m.id, "id");
  seen("number", (m) => String(m.number), "number");
  seen("title", (m) => m.title, "title");
  seen("slug", (m) => m.slug, "slug");
  seen("summary", (m) => m.summary, "summary");
  seen("principle", (m) => m.principle, "principle");
  seen("why", (m) => m.whyItWorks, "why-it-works text");
  seen("example", (m) => m.example, "example");
  for (const mode of ["default", "diplomatic", "direct", "firm", "written"] as const)
    seen(mode, (m) => m.scripts[mode], `${mode} script`);

  for (let i = 0; i < moves.length; i++)
    for (let j = i + 1; j < moves.length; j++) {
      const a = moves[i]!, b = moves[j]!;
      if (jaccard(words(a.title), words(b.title)) >= 0.6)
        issues.push({ level: "error", id: b.id, message: `Near-duplicate title with ${a.id}` });
      if (jaccard(words(a.principle), words(b.principle)) >= 0.6)
        issues.push({ level: "error", id: b.id, message: `Near-duplicate principle with ${a.id}` });
      if (jaccard(words(a.scripts.default), words(b.scripts.default)) >= 0.6)
        issues.push({ level: "error", id: b.id, message: `Near-duplicate default script with ${a.id}` });
    }

  const ids = new Set(moves.map((m) => m.id));
  for (const m of moves) {
    if (m.id !== `mv_${String(m.number).padStart(3, "0")}`)
      issues.push({ level: "error", id: m.id, message: "Id does not match number" });
    const ci = CATEGORY_IDS.indexOf(m.category);
    const lo = ci * MOVES_PER_CATEGORY + 1, hi = lo + MOVES_PER_CATEGORY - 1;
    if (m.number < lo || m.number > hi)
      issues.push({ level: "error", id: m.id, message: `Number outside ${m.category} range ${lo}-${hi}` });
    for (const r of m.related) {
      if (r === m.id) issues.push({ level: "error", id: m.id, message: "Related to itself" });
      else if (!ids.has(r)) {
        const n = Number(r.slice(3));
        issues.push(n >= 1 && n <= TOTAL_MOVES
          ? { level: "pending", id: m.id, message: `Related ${r} not yet authored` }
          : { level: "error", id: m.id, message: `Related ${r} is out of range` });
      }
    }
    if (m.risk !== "low" && m.ethicalBoundary.length < 60)
      issues.push({ level: "error", id: m.id, message: "Medium/high risk Move needs a fuller ethical boundary" });
    if (m.editorial.status === "retired" && !m.editorial.replacedBy)
      issues.push({ level: "pending", id: m.id, message: "Retired without replacement" });
  }
  for (const c of CATEGORIES) {
    const n = moves.filter((m) => m.category === c.id).length;
    if (n > MOVES_PER_CATEGORY) issues.push({ level: "error", id: c.id, message: `${n} Moves exceeds ${MOVES_PER_CATEGORY}` });
    if (n < MOVES_PER_CATEGORY) issues.push({ level: "pending", id: c.id, message: `${n}/${MOVES_PER_CATEGORY} authored` });
  }
  if (moves.length !== TOTAL_MOVES)
    issues.push({ level: "pending", id: "catalog", message: `${moves.length}/${TOTAL_MOVES} Moves authored` });
  return issues;
}
