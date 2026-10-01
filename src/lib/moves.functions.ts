import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listSummaries, publicView, fullPart, findVisibleBySlug, findVisibleById, dailyMove, summarize } from "./moves.server";
import { getTier } from "./moveiq.server";

const ref = z.string().regex(/^mv_\d{3}$/);

export const listMoves = createServerFn({ method: "GET" }).handler(async () => listSummaries());

export const getMove = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const m = findVisibleBySlug(data.slug);
    if (!m) return null;
    const related = m.related
      .map((id) => findVisibleById(id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ id: s.id, slug: s.slug, number: s.number, title: s.title, category: s.category }));
    return { ...publicView(m), relatedMoves: related };
  });

/** Pro execution guidance — entitlement is checked on the server, never in the browser. */
export const getMoveFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const m = findVisibleBySlug(data.slug);
    if (!m) return { ok: false as const, reason: "missing" as const };
    if (m.access === "pro" && (await getTier(context.supabase, context.userId)) !== "pro")
      return { ok: false as const, reason: "pro_required" as const };
    return { ok: true as const, full: fullPart(m) };
  });

export const getDailyMove = createServerFn({ method: "GET" }).handler(async () => {
  const m = dailyMove();
  return m ? { ...summarize(m), total: 90 } : null;
});

/** Light summaries for references (Saved, analysis links). Only visible Moves resolve. */
export const resolveMoves = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ids: z.array(ref).max(100) }).parse(d))
  .handler(async ({ data }) =>
    data.ids.map((id) => {
      const m = findVisibleById(id);
      return m ? { id, found: true as const, slug: m.slug, number: m.number, title: m.title, category: m.category, principle: m.principle, reviewDraft: m.editorial.status !== "published" } : { id, found: false as const };
    }),
  );

export const listSavedMoves = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_moves")
      .select("move_ref, move_version, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Saved Moves could not be loaded.");
    return (data ?? []).map((r) => {
      const m = findVisibleById(r.move_ref);
      return { ...r, move: m ? { slug: m.slug, number: m.number, title: m.title, category: m.category, principle: m.principle, reviewDraft: m.editorial.status !== "published" } : null };
    });
  });

export const setMoveSaved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ moveRef: ref, saved: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.saved) {
      const m = findVisibleById(data.moveRef);
      if (!m) return { ok: false as const, error: "This Move is not available." };
      const { error } = await supabase.from("saved_moves").insert({ user_id: userId, move_ref: m.id, move_version: m.editorial.version });
      if (error && error.code !== "23505") return { ok: false as const, error: "Could not save. Please try again." };
    } else {
      const { error } = await supabase.from("saved_moves").delete().eq("user_id", userId).eq("move_ref", data.moveRef);
      if (error) return { ok: false as const, error: "Could not remove. Please try again." };
    }
    return { ok: true as const };
  });

export const isMoveSaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ moveRef: ref }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("saved_moves").select("id").eq("move_ref", data.moveRef).maybeSingle();
    return { saved: !!row };
  });
