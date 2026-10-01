import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { StoredResult } from "./moveiq-schema";
import { getTier } from "./moveiq.server";

/** Editable plan content. The original recommendation is stored as version 1 and never modified. */
export const planContentSchema = z.object({
  move: z.string().trim().min(1).max(1000),
  opening: z.string().max(600).default(""),
  script: z.string().max(4000).default(""),
  mode: z.enum(["diplomatic", "direct", "hard_line", "custom"]).default("direct"),
  steps: z.array(z.string().max(400)).max(12).default([]),
  notes: z.string().max(3000).default(""),
  moveRef: z.string().regex(/^mv_\d{3}$/).nullable().default(null),
});
export type PlanContent = z.infer<typeof planContentSchema>;

const PRO_ONLY = "Editable Move Plans are included with Pro. Your existing plans stay readable.";

export const createPlanFromCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ analysisId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if ((await getTier(supabase, userId)) !== "pro") return { ok: false as const, error: PRO_ONLY };
    const { data: existing } = await supabase
      .from("move_plans").select("id").eq("analysis_id", data.analysisId).eq("status", "active").maybeSingle();
    if (existing) return { ok: true as const, id: existing.id, existed: true };
    const { data: a } = await supabase.from("analyses").select("id, title, result").eq("id", data.analysisId).maybeSingle();
    if (!a) return { ok: false as const, error: "Case not found." };
    const res = a.result as unknown as StoredResult;
    if (res.tier !== "pro") return { ok: false as const, error: "This case has a limited analysis. Run a new full analysis to build a plan." };
    const x = res.analysis;
    const content: PlanContent = {
      move: x.move.recommended, opening: x.scripts.direct.split(/(?<=[.?!])\s/)[0] ?? "", script: x.scripts.direct,
      mode: "direct", steps: [], notes: "", moveRef: x.move_refs?.primary ?? null,
    };
    const { data: plan, error } = await supabase
      .from("move_plans")
      .insert({ user_id: userId, analysis_id: a.id, title: a.title.slice(0, 160), move_ref: content.moveRef, current_version: 1 })
      .select("id").single();
    if (error || !plan) return { ok: false as const, error: "The plan could not be created." };
    const { error: vErr } = await supabase.from("move_plan_versions").insert({
      plan_id: plan.id, user_id: userId, version: 1, source: "original", content: content as unknown as Json, note: "Original recommendation",
    });
    if (vErr) return { ok: false as const, error: "The plan was created but its original version could not be saved." };
    return { ok: true as const, id: plan.id, existed: false };
  });

export const getPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: plan } = await supabase
      .from("move_plans")
      .select("id, title, status, current_version, draft, draft_saved_at, analysis_id, move_ref, created_at, updated_at, archived_at")
      .eq("id", data.id).maybeSingle();
    if (!plan) return { found: false as const };
    const { data: versions } = await supabase
      .from("move_plan_versions")
      .select("version, source, note, content, created_at")
      .eq("plan_id", data.id).order("version", { ascending: false });
    let alternatives: { option: string; tradeoff: string }[] = [];
    let scripts: Record<string, string> = {};
    if (plan.analysis_id) {
      const { data: a } = await supabase.from("analyses").select("result").eq("id", plan.analysis_id).maybeSingle();
      const r = a?.result as unknown as StoredResult | undefined;
      if (r?.tier === "pro") { alternatives = r.analysis.move.alternatives; scripts = r.analysis.scripts; }
    }
    return {
      found: true as const,
      tier: await getTier(supabase, userId),
      plan: { ...plan, draft: plan.draft as PlanContent | null },
      versions: (versions ?? []).map((v) => ({ ...v, content: v.content as unknown as PlanContent })),
      alternatives, scripts,
    };
  });

/** Autosave: recovery copy only, separate from the version history. */
export const savePlanDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), content: planContentSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from("move_plans")
      .update({ draft: data.content as unknown as Json, draft_saved_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", data.id).eq("status", "active");
    return error || !count ? { ok: false as const } : { ok: true as const, at: new Date().toISOString() };
  });

export const savePlanVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(), content: planContentSchema, expectedVersion: z.number().int().min(1),
      source: z.enum(["edit", "alternative", "restore"]), note: z.string().trim().max(300).default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if ((await getTier(supabase, userId)) !== "pro") return { ok: false as const, error: PRO_ONLY };
    const { data: plan } = await supabase.from("move_plans").select("current_version, status").eq("id", data.id).maybeSingle();
    if (!plan) return { ok: false as const, error: "Plan not found." };
    if (plan.status !== "active") return { ok: false as const, error: "Restore this plan before editing it." };
    if (plan.current_version !== data.expectedVersion)
      return { ok: false as const, error: "This plan changed in another tab. Reload to see the latest version.", conflict: true };
    const next = plan.current_version + 1;
    const { error } = await supabase.from("move_plan_versions").insert({
      plan_id: data.id, user_id: userId, version: next, source: data.source, content: data.content as unknown as Json, note: data.note,
    });
    if (error) return { ok: false as const, error: error.code === "23505" ? "Another save happened first. Reload and try again." : "The version could not be saved." };
    const { error: uErr } = await supabase
      .from("move_plans")
      .update({ current_version: next, draft: null, draft_saved_at: null, move_ref: data.content.moveRef })
      .eq("id", data.id);
    if (uErr) return { ok: false as const, error: "Saved, but the plan header could not update. Reload to continue." };
    return { ok: true as const, version: next };
  });

export const setPlanStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from("move_plans")
      .update({ status: data.archived ? "archived" : "active", archived_at: data.archived ? new Date().toISOString() : null }, { count: "exact" })
      .eq("id", data.id);
    return error || !count ? { ok: false as const, error: "Could not update the plan." } : { ok: true as const };
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("move_plans")
      .select("id, title, status, current_version, updated_at, analysis_id, draft_saved_at")
      .order("updated_at", { ascending: false }).limit(200);
    if (error) throw new Error("Plans could not be loaded.");
    return data ?? [];
  });
