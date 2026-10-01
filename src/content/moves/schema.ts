import { z } from "zod";
import { CATEGORY_IDS, GOAL_IDS, SITUATION_IDS, CHANNEL_IDS, RELATIONSHIP_IDS } from "./taxonomy";

/**
 * Canonical Move record. One record per Move; the `id` is permanent and never reused,
 * even when the Move is revised or retired. User plans reference `id` + `version`.
 */
export const EDITORIAL_STATES = ["draft", "in_review", "approved", "published", "retired", "archived"] as const;

const text = (min: number) => z.string().trim().min(min);
const items = (minItems: number, minLen = 12) => z.array(text(minLen)).min(minItems);

export const moveSchema = z.object({
  id: z.string().regex(/^mv_\d{3}$/),
  number: z.number().int().min(1).max(90),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: text(4).max(60),
  summary: text(40).max(220),
  category: z.enum(CATEGORY_IDS),
  situations: z.array(z.enum(SITUATION_IDS)).min(1),
  goals: z.array(z.enum(GOAL_IDS)).min(1),
  channels: z.array(z.enum(CHANNEL_IDS)).min(1),
  relationships: z.array(z.enum(RELATIONSHIP_IDS)).min(1),
  urgency: z.array(z.enum(["today", "this_week", "exploring"])).min(1),
  principle: text(30),
  whyItWorks: text(80),
  whenToUse: items(2),
  whenNotToUse: items(2),
  signals: items(2),
  preparation: items(2),
  steps: items(3),
  openingLine: text(20),
  scripts: z.object({
    default: text(40),
    diplomatic: text(40),
    direct: text(30),
    firm: text(30),
    written: text(60),
    message: text(20).optional(),
  }),
  reactions: z.array(z.object({ ifThey: text(8), counter: text(20) })).min(2),
  secondMove: text(40),
  followUp: text(30),
  mistakes: items(2),
  ethicalBoundary: text(40),
  risk: z.enum(["low", "medium", "high"]),
  walkAway: items(1),
  example: text(80),
  related: z.array(z.string().regex(/^mv_\d{3}$/)).min(1).max(4),
  access: z.enum(["free", "pro"]),
  editorial: z.object({
    status: z.enum(EDITORIAL_STATES),
    version: z.number().int().min(1),
    owner: z.string(),
    reviewer: z.string().nullable(),
    lastReviewed: z.string().nullable(),
    replacedBy: z.string().nullable().default(null),
  }),
});

export type Move = z.infer<typeof moveSchema>;
export type MoveInput = z.input<typeof moveSchema>;

/** Editorial defaults: content drafted for owner review; no human reviewer is claimed. */
export const DRAFT_EDITORIAL = {
  status: "in_review" as const,
  version: 1,
  owner: "Power Move IQ Editorial",
  reviewer: null,
  lastReviewed: null,
  replacedBy: null,
};
