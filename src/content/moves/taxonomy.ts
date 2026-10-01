/**
 * Move taxonomy. 15 strategic categories × 6 Moves each = 90 Moves.
 * Categories group Moves by the strategic job they do. Situations and goals are
 * independent tags used for search, filtering and recommendation — they are not
 * multiplied into the count.
 */
export const CATEGORIES = [
  { id: "framing", label: "Framing & Clarity", purpose: "Define what is actually happening before reacting." },
  { id: "information", label: "Information Gathering", purpose: "Learn what you do not yet know." },
  { id: "decision", label: "Decision Control", purpose: "Shape who decides what, and when." },
  { id: "leverage", label: "Leverage & Alternatives", purpose: "Build and use real options." },
  { id: "positioning", label: "Positioning & Value", purpose: "Establish and defend the worth of what you offer." },
  { id: "pricing", label: "Anchoring & Pricing", purpose: "Set and hold the numbers." },
  { id: "scope", label: "Scope Control", purpose: "Keep the work matched to the agreement." },
  { id: "timing", label: "Timing & Silence", purpose: "Use pace and pauses deliberately." },
  { id: "boundaries", label: "Boundaries", purpose: "State limits clearly and hold them." },
  { id: "trades", label: "Objections, Concessions & Trades", purpose: "Answer pushback without giving value away." },
  { id: "commitment", label: "Alignment & Commitment", purpose: "Turn agreement into owned next steps." },
  { id: "accountability", label: "Accountability & Documentation", purpose: "Create a shared record people can rely on." },
  { id: "repair", label: "De-escalation & Repair", purpose: "Lower heat and restore working trust." },
  { id: "escalation", label: "Escalation", purpose: "Raise the stakes deliberately and proportionately." },
  { id: "exit", label: "Exit & Recovery", purpose: "Step back cleanly, or recover after a Move fails." },
] as const;
export const CATEGORY_IDS = [
  "framing", "information", "decision", "leverage", "positioning", "pricing", "scope", "timing",
  "boundaries", "trades", "commitment", "accountability", "repair", "escalation", "exit",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];
export const MOVES_PER_CATEGORY = 6;
export const TOTAL_MOVES = CATEGORY_IDS.length * MOVES_PER_CATEGORY; // 90

export const SITUATIONS = [
  ["client_scope", "Client scope"], ["pricing", "Pricing"], ["offer", "Offer negotiation"],
  ["compensation", "Compensation"], ["promotion", "Promotion"], ["workplace_conflict", "Workplace conflict"],
  ["leadership_alignment", "Leadership alignment"], ["vendor", "Vendor negotiation"], ["partnership", "Partnership"],
  ["boundary", "Boundary setting"], ["difficult_conversation", "Difficult conversation"], ["commitment", "Commitment"],
  ["follow_up", "Follow-up"], ["escalation", "Escalation"], ["walk_away", "Walk-away decision"],
  ["relationship_repair", "Relationship repair"],
] as const;
export const SITUATION_IDS = SITUATIONS.map((s) => s[0]) as unknown as readonly [
  (typeof SITUATIONS)[number][0], ...(typeof SITUATIONS)[number][0][]
];

export const GOALS = [
  ["clarity", "Get clarity"], ["protect_value", "Protect value"], ["negotiate_terms", "Negotiate terms"],
  ["set_boundary", "Set a boundary"], ["gain_commitment", "Gain commitment"], ["resolve_conflict", "Resolve conflict"],
  ["de_escalate", "De-escalate tension"], ["prepare_escalation", "Prepare for escalation"],
  ["recover_relationship", "Recover the relationship"], ["decide_walk_away", "Decide whether to walk away"],
] as const;
export const GOAL_IDS = GOALS.map((g) => g[0]) as unknown as readonly [
  (typeof GOALS)[number][0], ...(typeof GOALS)[number][0][]
];

export const CHANNEL_IDS = ["in_person", "phone", "video", "email", "chat", "text"] as const;
export const CHANNEL_LABELS: Record<(typeof CHANNEL_IDS)[number], string> = {
  in_person: "In person", phone: "Phone", video: "Video", email: "Email", chat: "Slack / chat", text: "Text",
};
export const RELATIONSHIP_IDS = ["client", "employer", "manager", "colleague", "vendor", "partner", "report"] as const;
export const RISK_LABELS = { low: "Low risk", medium: "Moderate risk", high: "High risk" } as const;

export const labelOf = (list: readonly (readonly [string, string])[], id: string) =>
  list.find((x) => x[0] === id)?.[1] ?? id;
export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
