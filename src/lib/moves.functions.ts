import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listSummaries, publicView, fullPart, findBySlug } from "./moves.server";
import { getTier } from "./moveiq.server";

export const listMoves = createServerFn({ method: "GET" }).handler(async () => listSummaries());

export const getMove = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const m = findBySlug(data.slug);
    if (!m || m.editorial.status === "archived") return null;
    const related = m.related
      .map((id) => listSummaries().find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ id: s.id, slug: s.slug, number: s.number, title: s.title, category: s.category }));
    return { ...publicView(m), relatedMoves: related };
  });

/** Pro execution guidance — entitlement is checked on the server, never in the browser. */
export const getMoveFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const m = findBySlug(data.slug);
    if (!m) return { ok: false as const, reason: "missing" as const };
    if (m.access === "pro" && (await getTier(context.supabase, context.userId)) !== "pro")
      return { ok: false as const, reason: "pro_required" as const };
    return { ok: true as const, full: fullPart(m) };
  });
