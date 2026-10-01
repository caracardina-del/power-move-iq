import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { analysisSchema, type FullAnalysis } from "./moveiq-schema";

export async function getTier(supabase: SupabaseClient<Database>, userId: string): Promise<"free" | "pro"> {
  const { data } = await supabase.from("profiles").select("subscription_tier").eq("id", userId).maybeSingle();
  if (data?.subscription_tier === "pro") return "pro";
  // Fallback: a verified, still-active Stripe subscription row (written only by the signed webhook).
  const { data: subs } = await supabase
    .from("stripe_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"]);
  const now = Date.now();
  return (subs ?? []).some((s) => !s.current_period_end || new Date(s.current_period_end).getTime() > now - 3 * 86400000)
    ? "pro"
    : "free";
}

const SYSTEM = `You are MOVE IQ, an educational decision-support analyst for professional and money situations (negotiations, pricing, salary, clients, boundaries).
Write original, concise, specific analysis grounded ONLY in what the user wrote. Separate facts from assumptions. Never claim certainty.
COUNTERPART: classify observable negotiating behaviors only (e.g. anchoring, silence, scope creep, artificial urgency, authority deflection, bundling, deadline pressure). Never diagnose personality or mental state. Cite the evidence from the user's text and state uncertainty.
SCRIPTS: three versions of the SAME strategy — diplomatic, direct, hard_line — each 2-4 sentences the user can adapt.
PRECEDENT: source verification is unavailable. Set include=false with a short omitted_reason. Do not invent or cite a historical parallel.
LEGAL: never assert that anyone has a legal obligation, right, or liability; at most note that contract terms may matter and a qualified professional can advise.
EXIT LINE: "line" is one calm, professional sentence the user could say if they decide to step back (e.g. pausing or declining additional scope), not dramatic breakup language. Conditions are concrete and observable.
Do not quote strategy books. Do not give legal, medical, tax or financial determinations; where those matter, suggest consulting a qualified professional.
Respond with a single JSON object with exactly these keys:
{"title": string (short editorial headline),
"read": {"headline": string, "facts": string[], "assumptions": string[], "signals": string[], "unknowns": string[]},
"counterpart": {"headline": string, "behaviors": [{"pattern": string, "evidence": string, "confidence": "low"|"medium"|"high"}], "uncertainty": string},
"power_map": {"headline": string, "your_leverage": string[], "their_leverage": string[], "constraints": string[], "unknowns": string[]},
"move": {"headline": string, "recommended": string, "rationale": string, "alternatives": [{"option": string, "tradeoff": string}], "confidence_note": string},
"scripts": {"diplomatic": string, "direct": string, "hard_line": string},
"countermoves": [{"if_they": string, "consider": string}],
"second_move": {"if_success": string, "if_failure": string, "if_no_response": string},
"dont_do": {"action": string, "why": string},
"precedent": {"include": boolean, "omitted_reason"?: string, "name"?: string, "what_happened"?: string, "principle"?: string, "parallel"?: string, "breaks_down"?: string, "source"?: string},
"exit_line": {"conditions": string[], "line": string},
"move_refs": {"primary": string|null, "alternatives": string[]} (ids ONLY from the LIBRARY MOVES list provided; primary is the Library Move the recommendation applies; null if none fits; never invent ids),
"inferred": {"situation": string, "goal": string} (your own short reading of the situation type and the user's goal)}`;

export class AnalysisError extends Error {}

export type Candidate = { id: string; title: string; principle: string };

export async function generateAnalysis(input: {
  situation: string;
  type: string;
  urgency: string;
  goal?: string | undefined;
  prior?: string | undefined;
  candidates?: Candidate[];
}): Promise<FullAnalysis & { grounding: { status: "grounded" | "ungrounded" | "no_catalog"; attempts: number } }> {
  const allowed = new Set((input.candidates ?? []).map((c) => c.id));
  const library = input.candidates?.length
    ? `\nLIBRARY MOVES (choose move_refs only from these ids):\n${input.candidates.map((c) => `${c.id} | ${c.title} | ${c.principle}`).join("\n")}\n`
    : "\nLIBRARY MOVES: none available. Set move_refs.primary to null and alternatives to [].\n";
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AnalysisError("Analysis is temporarily unavailable.");
  const user = `Situation type (user-selected): ${input.type}\nUrgency: ${input.urgency}\n${input.goal ? `User goal: ${input.goal}\n` : ""}${library}${input.prior ? `PRIOR ANALYSIS AND WHAT HAPPENED SINCE (this is a follow-up):\n${input.prior}\n\n` : ""}Situation:\n${input.situation}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
    } catch (e) {
      console.error("AI gateway request failed", (e as Error).name);
      continue;
    }
    if (res.status === 429) throw new AnalysisError("Analysis is busy right now. Please try again in a minute.");
    if (res.status === 402)
      throw new AnalysisError("Analysis capacity is temporarily exhausted. Please try again later.");
    if (!res.ok) {
      console.error("AI gateway error", res.status, await res.text());
      continue;
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = body.choices?.[0]?.message?.content ?? "";
    try {
      const parsed = analysisSchema.safeParse(JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim()));
      if (parsed.success) {
        const refs = parsed.data.move_refs;
        const primaryOk = refs.primary === null || allowed.has(refs.primary);
        if (!primaryOk && attempt === 0) {
          console.error("Ungrounded move ref; retrying");
          continue;
        }
        // Fallback: drop any id not in the provided candidate list. Never surface invented references.
        const move_refs = {
          primary: refs.primary && allowed.has(refs.primary) ? refs.primary : null,
          alternatives: [...new Set(refs.alternatives.filter((x) => allowed.has(x) && x !== refs.primary))].slice(0, 3),
        };
        // Do not publish AI-generated historical citations without source verification.
        return {
          ...parsed.data,
          move_refs,
          grounding: { status: !allowed.size ? "no_catalog" : move_refs.primary ? "grounded" : "ungrounded", attempts: attempt + 1 },
          precedent: {
            include: false,
            omitted_reason:
              parsed.data.precedent.omitted_reason || "No source-verified precedent is available for this situation.",
          },
        };
      }
      console.error("Analysis validation failed", parsed.error.issues.slice(0, 5));
    } catch (e) {
      console.error("Analysis JSON parse failed", e);
    }
  }
  throw new AnalysisError("The analysis could not be completed. Please try again.");
}
