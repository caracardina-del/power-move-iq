/**
 * Single source of product facts and the entitlement matrix (audit items 99, 105).
 * UI copy must read numbers from here rather than hard-coding them.
 */
import { CATEGORIES, MOVES_PER_CATEGORY, TOTAL_MOVES } from "@/content/moves/taxonomy";
import { FREE_MONTHLY_LIMIT } from "./moveiq-schema";
import { PAST_DUE_GRACE_DAYS } from "./billing-policy";

export const PRODUCT = {
  plannedMoves: TOTAL_MOVES,
  categories: CATEGORIES.length,
  movesPerCategory: MOVES_PER_CATEGORY,
  /** How the catalog is structured — use this wording, never "principles × domains". */
  structure: `${CATEGORIES.length} strategic categories with ${MOVES_PER_CATEGORY} Moves each`,
  freeMonthlyAnalyses: FREE_MONTHLY_LIMIT,
  guestAnalyses: 1,
  price: { monthly: "$14.99", annual: "$99" },
  cardRequiredForFree: false,
  trial: null,
  pastDueGraceDays: PAST_DUE_GRACE_DAYS,
} as const;

export type AccessLevel = "guest" | "free" | "pro" | "pro_canceling" | "pro_past_due" | "expired";

/** What each account level can do. Server checks (getTier, RLS) remain authoritative. */
export const ENTITLEMENTS: Record<AccessLevel, {
  analyses: string; analysisDepth: "limited" | "full"; freeMoves: boolean; proMoves: boolean;
  saveCases: boolean; outcomeMemory: boolean; followUp: boolean; ownContent: "none" | "read" | "full";
}> = {
  guest: { analyses: "1 before sign-up", analysisDepth: "limited", freeMoves: true, proMoves: false, saveCases: false, outcomeMemory: false, followUp: false, ownContent: "none" },
  free: { analyses: `${FREE_MONTHLY_LIMIT} per month`, analysisDepth: "limited", freeMoves: true, proMoves: false, saveCases: true, outcomeMemory: false, followUp: false, ownContent: "full" },
  pro: { analyses: "Unlimited", analysisDepth: "full", freeMoves: true, proMoves: true, saveCases: true, outcomeMemory: true, followUp: true, ownContent: "full" },
  pro_canceling: { analyses: "Unlimited until period end", analysisDepth: "full", freeMoves: true, proMoves: true, saveCases: true, outcomeMemory: true, followUp: true, ownContent: "full" },
  pro_past_due: { analyses: `Unlimited for up to ${PAST_DUE_GRACE_DAYS} days after the period end while payment is retried`, analysisDepth: "full", freeMoves: true, proMoves: true, saveCases: true, outcomeMemory: true, followUp: true, ownContent: "full" },
  expired: { analyses: `${FREE_MONTHLY_LIMIT} per month`, analysisDepth: "limited", freeMoves: true, proMoves: false, saveCases: true, outcomeMemory: false, followUp: false, ownContent: "read" },
};
