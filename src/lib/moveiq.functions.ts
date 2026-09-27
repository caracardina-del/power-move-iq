import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { FREE_MONTHLY_LIMIT, limit, SITUATION_TYPES, URGENCIES, type StoredResult } from "./moveiq-schema";
import { AnalysisError, generateAnalysis, getTier } from "./moveiq.server";

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export const getEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tier = await getTier(context.supabase, context.userId);
    const { count } = await context.supabase.from("analyses").select("id", { count: "exact", head: true }).gte("created_at", monthStart());
    return { tier, usedThisMonth: count ?? 0, freeLimit: FREE_MONTHLY_LIMIT };
  });

export const runAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      situation: z.string().trim().min(40, "Add a little more detail (at least 40 characters).").max(6000),
      type: z.enum(SITUATION_TYPES),
      urgency: z.enum(URGENCIES),
      parentId: z.string().uuid().optional(),
      update: z.string().trim().max(3000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const tier = await getTier(supabase, userId);
    if (tier === "free") {
      if (data.parentId) return { ok: false as const, error: "Follow-up analysis is included with Pro." };
      const { count } = await supabase.from("analyses").select("id", { count: "exact", head: true }).gte("created_at", monthStart());
      if ((count ?? 0) >= FREE_MONTHLY_LIMIT) return { ok: false as const, error: `Free accounts include ${FREE_MONTHLY_LIMIT} analyses per month. Upgrade to Pro for unlimited analyses.` };
    }
    let prior: string | undefined;
    if (data.parentId) {
      const { data: parent } = await supabase.from("analyses").select("situation, result").eq("id", data.parentId).maybeSingle();
      if (!parent) return { ok: false as const, error: "Original case not found." };
      prior = `Original situation: ${parent.situation}\nPrior recommendation: ${JSON.stringify((parent.result as { analysis?: { move?: unknown } })?.analysis?.move ?? {})}\nWhat happened since: ${data.update ?? ""}`;
    }
    try {
      const full = await generateAnalysis({ ...data, prior });
      const stored: StoredResult = tier === "pro" ? { tier: "pro", analysis: full } : { tier: "free", analysis: limit(full) };
      const { data: row, error } = await supabase
        .from("analyses")
        .insert({
          user_id: userId,
          title: full.title,
          situation: data.parentId ? `${data.update ?? ""}` : data.situation,
          context: { type: data.type, urgency: data.urgency, parent_id: data.parentId ?? null } as Json,
          result: stored as unknown as Json,
          is_saved: tier === "pro",
        })
        .select("id")
        .single();
      if (error) {
        console.error(error);
        return { ok: false as const, error: "Your analysis was generated but could not be saved. Please try again." };
      }
      return { ok: true as const, id: row.id };
    } catch (e) {
      return { ok: false as const, error: e instanceof AnalysisError ? e.message : "The analysis could not be completed. Please try again." };
    }
  });

export const getCase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tier = await getTier(context.supabase, context.userId);
    const { data: row } = await context.supabase.from("analyses").select("id, title, situation, context, result, chosen_move, created_at").eq("id", data.id).maybeSingle();
    if (!row) return { tier, found: false as const };
    const { data: outcomes } = await context.supabase.from("outcomes").select("id, outcome, chosen_move, result_note, recorded_at").eq("analysis_id", data.id).order("recorded_at", { ascending: false });
    return {
      tier,
      found: true as const,
      row: { ...row, context: row.context as { type?: string; urgency?: string; parent_id?: string | null }, result: row.result as unknown as StoredResult },
      outcomes: outcomes ?? [],
    };
  });

export const recordOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      analysisId: z.string().uuid(),
      outcome: z.enum(["accepted", "negotiated", "declined", "ghosted", "other"]),
      chosenMove: z.string().trim().min(2).max(500),
      note: z.string().trim().max(2000).default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if ((await getTier(supabase, userId)) !== "pro") return { ok: false as const, error: "Outcome Memory is included with Pro." };
    const { error } = await supabase.from("outcomes").insert({ user_id: userId, analysis_id: data.analysisId, outcome: data.outcome, chosen_move: data.chosenMove, result_note: data.note });
    if (error) return { ok: false as const, error: "The outcome could not be saved." };
    await supabase.from("analyses").update({ chosen_move: data.chosenMove }).eq("id", data.analysisId);
    return { ok: true as const };
  });

export const listCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tier = await getTier(context.supabase, context.userId);
    const { data } = await context.supabase.from("analyses").select("id, title, situation, context, created_at, outcomes(outcome)").order("created_at", { ascending: false }).limit(100);
    return { tier, cases: (data ?? []).map((c) => ({ ...c, context: c.context as { type?: string } })) };
  });

export const getOutcomeMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tier = await getTier(context.supabase, context.userId);
    if (tier !== "pro") return { tier, rows: [], metrics: null };
    const { data } = await context.supabase.from("outcomes").select("id, outcome, chosen_move, result_note, recorded_at, analyses(id, title, created_at)").order("recorded_at", { ascending: false });
    const rows = data ?? [];
    const total = rows.length;
    const negotiated = rows.filter((r) => r.outcome === "negotiated" || r.outcome === "accepted").length;
    const days = rows.map((r) => {
      const a = r.analyses as { created_at: string } | null;
      return a ? (new Date(r.recorded_at).getTime() - new Date(a.created_at).getTime()) / 86400000 : null;
    }).filter((x): x is number => x !== null);
    return {
      tier,
      rows,
      metrics: { total, favorableRate: total ? Math.round((negotiated / total) * 100) : null, avgDays: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null },
    };
  });

export const getAccountSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, streak, cases, favs, outcomes] = await Promise.all([
      supabase.from("profiles").select("display_name, email, subscription_tier, preferences").eq("id", userId).maybeSingle(),
      supabase.from("streaks").select("current_streak, longest_streak").eq("user_id", userId).maybeSingle(),
      supabase.from("analyses").select("id", { count: "exact", head: true }),
      supabase.from("favorite_moves").select("move_id", { count: "exact", head: true }),
      supabase.from("outcomes").select("id", { count: "exact", head: true }),
    ]);
    return {
      tier: profile.data?.subscription_tier === "pro" ? ("pro" as const) : ("free" as const),
      displayName: profile.data?.display_name ?? "",
      preferences: (profile.data?.preferences ?? {}) as { focus?: string },
      streak: streak.data?.current_streak ?? 0,
      longest: streak.data?.longest_streak ?? 0,
      cases: cases.count ?? 0,
      favorites: favs.count ?? 0,
      outcomes: outcomes.count ?? 0,
    };
  });

const LENS = {
  title: "The Cost of Unclear",
  thesis: "Ambiguity is rarely neutral. In professional situations, it often transfers risk to the person willing to wait, stretch, or keep working without a decision.",
  sections: [
    { h: "Look for the unnamed decision.", p: "A stalled negotiation may appear to be about timing when the real issue is that nobody has named who owns approval. A “small extra” may feel socially awkward to price because nobody has acknowledged that the scope changed." },
  ],
  questions: ["What decision is still unnamed?", "Who benefits while it remains unclear?", "What calm deadline would create useful movement?"],
  exercise: "Choose one vague situation. Turn it into a written decision request with an owner, two viable paths, and a date.",
};

export const getWeeklyLens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tier = await getTier(context.supabase, context.userId);
    return tier === "pro" ? { tier, lens: LENS } : { tier, lens: { title: LENS.title, thesis: LENS.thesis, sections: [], questions: [], exercise: "" } };
  });
