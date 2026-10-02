import { z } from "zod";

const list = z.array(z.string()).default([]);

export const analysisSchema = z.object({
  title: z.string().min(3).max(160),
  read: z.object({
    headline: z.string(),
    facts: list,
    assumptions: list,
    signals: list,
    unknowns: list,
  }),
  counterpart: z.object({
    headline: z.string(),
    behaviors: z
      .array(
        z.object({
          pattern: z.string(),
          evidence: z.string(),
          confidence: z.enum(["low", "medium", "high"]).catch("low"),
        }),
      )
      .default([]),
    uncertainty: z.string().default(""),
  }),
  power_map: z.object({
    headline: z.string(),
    your_leverage: list,
    their_leverage: list,
    constraints: list,
    unknowns: list,
  }),
  move: z.object({
    headline: z.string(),
    recommended: z.string(),
    rationale: z.string().default(""),
    alternatives: z.array(z.object({ option: z.string(), tradeoff: z.string() })).default([]),
    confidence_note: z.string().default(""),
  }),
  do_this_now: list,
  watch_out: list,
  scripts: z.object({ diplomatic: z.string(), direct: z.string(), hard_line: z.string() }),
  countermoves: z.array(z.object({ if_they: z.string(), consider: z.string() })).default([]),
  second_move: z.object({
    if_success: z.string(),
    if_failure: z.string(),
    if_no_response: z.string(),
  }),
  dont_do: z.object({ action: z.string(), why: z.string() }),
  precedent: z.object({
    include: z.boolean(),
    omitted_reason: z.string().optional(),
    name: z.string().optional(),
    what_happened: z.string().optional(),
    principle: z.string().optional(),
    parallel: z.string().optional(),
    breaks_down: z.string().optional(),
    source: z.string().optional(),
  }),
  exit_line: z.object({ conditions: list, line: z.string().default("") }),
  /** Canonical grounding: ids of Library Moves the recommendation is built on. Validated server-side. */
  move_refs: z
    .object({ primary: z.string().nullable().default(null), alternatives: z.array(z.string()).default([]) })
    .default({ primary: null, alternatives: [] }),
  /** The model's own reading of the situation, kept separate from what the user selected. */
  inferred: z
    .object({ situation: z.string().default(""), goal: z.string().default("") })
    .default({ situation: "", goal: "" }),
});

export type FullAnalysis = z.infer<typeof analysisSchema>;

/** What free accounts receive. Stored in this shape so the full read never reaches a free client. */
export type LimitedAnalysis = Pick<FullAnalysis, "title" | "read" | "dont_do"> & {
  move_refs?: FullAnalysis["move_refs"];
  inferred?: FullAnalysis["inferred"];
  move: FullAnalysis["move"];
  do_this_now?: string[];
  watch_out?: string[];
};

export type StoredResult =
  { tier: "pro"; analysis: FullAnalysis } | { tier: "free"; analysis: LimitedAnalysis };

export function limit(a: FullAnalysis): LimitedAnalysis {
  return {
    title: a.title,
    read: a.read,
    dont_do: a.dont_do,
    move: a.move,
    do_this_now: a.do_this_now,
    watch_out: a.watch_out,
    move_refs: { primary: a.move_refs.primary, alternatives: [] },
    inferred: a.inferred,
  };
}

export const SITUATION_TYPES = [
  "Client negotiation",
  "Salary / career",
  "Pricing",
  "Boundary",
  "Difficult customer",
  "Offer / counteroffer",
  "Other",
] as const;
export const URGENCIES = ["Decision today", "Decision this week", "Exploring options"] as const;
export const FREE_MONTHLY_LIMIT = 3;

export const GOAL_OPTIONS = [
  ["clarity", "Get clarity"], ["protect_value", "Protect value"], ["negotiate_terms", "Negotiate terms"],
  ["set_boundary", "Set a boundary"], ["gain_commitment", "Gain commitment"], ["resolve_conflict", "Resolve conflict"],
  ["de_escalate", "De-escalate tension"], ["prepare_escalation", "Prepare for escalation"],
  ["recover_relationship", "Recover the relationship"], ["decide_walk_away", "Decide whether to walk away"],
] as const;
export const GOAL_IDS_INTAKE = GOAL_OPTIONS.map((g) => g[0]) as unknown as readonly [string, ...string[]];
