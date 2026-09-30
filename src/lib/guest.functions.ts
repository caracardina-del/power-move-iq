import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { limit, SITUATION_TYPES, URGENCIES, type LimitedAnalysis, type StoredResult } from "./moveiq-schema";
import { AnalysisError, generateAnalysis } from "./moveiq.server";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const GLOBAL_DAILY_CAP = 400;

/** One real free analysis before an account exists. Rate-limited per network; nothing is logged with the text. */
export const runGuestAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        situation: z.string().trim().min(40, "Add a little more detail (at least 40 characters).").max(6000),
        type: z.enum(SITUATION_TYPES),
        urgency: z.enum(URGENCIES),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const clientHash = await sha256(`pmiq-guest:${ip}:${process.env["SUPABASE_URL"] ?? ""}`);
    const since = new Date(Date.now() - 86400000).toISOString();
    const [mine, all] = await Promise.all([
      supabaseAdmin
        .from("guest_analyses")
        .select("id", { count: "exact", head: true })
        .eq("client_hash", clientHash)
        .gte("created_at", since),
      supabaseAdmin
        .from("guest_analyses")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
    ]);
    if ((mine.count ?? 0) >= 1)
      return {
        ok: false as const,
        code: "used" as const,
        error: "Your free analysis has been used. Create a free account to run another.",
      };
    if ((all.count ?? 0) >= GLOBAL_DAILY_CAP)
      return {
        ok: false as const,
        code: "busy" as const,
        error: "Free guest analyses are at capacity today. Create a free account to continue.",
      };
    try {
      const full = await generateAnalysis(data);
      const analysis: LimitedAnalysis = limit(full);
      const token = crypto.randomUUID() + crypto.randomUUID();
      const { error } = await supabaseAdmin.from("guest_analyses").insert({
        claim_hash: await sha256(token),
        client_hash: clientHash,
        situation: data.situation,
        context: { type: data.type, urgency: data.urgency } as Json,
        result: { tier: "free", analysis } as unknown as Json,
      });
      if (error) {
        console.error("guest insert failed", error.code);
        return { ok: false as const, code: "error" as const, error: "The analysis could not be completed. Please try again." };
      }
      return { ok: true as const, token, analysis };
    } catch (e) {
      return {
        ok: false as const,
        code: "error" as const,
        error: e instanceof AnalysisError ? e.message : "The analysis could not be completed. Please try again.",
      };
    }
  });

/** Moves the caller's own guest result (proven by its secret token) into their private cases. */
export const claimGuestAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().min(40).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await sha256(data.token);
    const { data: g } = await supabaseAdmin
      .from("guest_analyses")
      .select("id, situation, context, result, claimed_by, claimed_analysis_id")
      .eq("claim_hash", hash)
      .maybeSingle();
    if (!g) return { ok: false as const, error: "This free result is no longer available." };
    if (g.claimed_by) {
      if (g.claimed_by === context.userId && g.claimed_analysis_id)
        return { ok: true as const, id: g.claimed_analysis_id };
      return { ok: false as const, error: "This free result was already saved to another account." };
    }
    const stored = g.result as unknown as StoredResult;
    const { data: row, error } = await context.supabase
      .from("analyses")
      .insert({
        user_id: context.userId,
        title: stored.analysis.title,
        situation: g.situation,
        context: { ...(g.context as Record<string, unknown>), parent_id: null, guest: true } as Json,
        result: g.result,
        is_saved: true,
      })
      .select("id")
      .single();
    if (error || !row) return { ok: false as const, error: "Your free result could not be saved. Please try again." };
    await supabaseAdmin
      .from("guest_analyses")
      .update({ claimed_by: context.userId, claimed_analysis_id: row.id })
      .eq("id", g.id)
      .is("claimed_by", null);
    return { ok: true as const, id: row.id };
  });
