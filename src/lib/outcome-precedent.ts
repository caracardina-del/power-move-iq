import type { FullAnalysis } from "./moveiq-schema";

export type OutcomePrecedent = FullAnalysis["precedent"];
type History = { id: string; analysis_id: string; outcome: string; chosen_move: string | null; result_note: string; recorded_at: string; analyses: unknown };
const stop = new Set("the and that this with have from they their would could should want need about after before because situation client salary pricing other decision today week options".split(" "));
function tokens(text: string) {
  return new Set((text.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(x => !stop.has(x)));
}

/** Conservative exact-context/lexical matching; a weak match produces no precedent. */
export function selectOutcomePrecedent(input: { situation: string; type: string; goal?: string | undefined }, rows: History[]): OutcomePrecedent | undefined {
  const current = tokens(input.situation);
  if (current.size < 4 || input.type === "Other") return;
  for (const row of rows) {
    const a = row.analyses as { situation?: string; context?: { type?: string; goal?: string | undefined }; status?: string } | null;
    if (!a || a.status === "archived" || a.context?.type !== input.type || !a.situation) continue;
    if (input.goal && a.context.goal !== input.goal) continue;
    if (!["accepted", "negotiated", "declined"].includes(row.outcome) || !row.chosen_move?.trim() || row.result_note.trim().length < 30) continue;
    const prior = tokens(a.situation);
    const shared = [...current].filter(x => prior.has(x)).length;
    if (shared < 4 || shared / Math.max(current.size, prior.size) < 0.6) continue;
    return {
      include: true,
      name: "Your previous recorded outcome",
      what_happened: `${row.outcome}: ${row.result_note}`,
      principle: `Action you recorded: ${row.chosen_move}`,
      parallel: `Same situation category (${input.type}) with closely matching context.`,
      breaks_down: "A recorded outcome is not proof that the same action will work again. Check the people, constraints, and timing.",
      source: `Private case ${row.analysis_id}; outcome ${row.id}; recorded ${row.recorded_at}`,
    };
  }
  return undefined;
}
