import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
import { situations } from "@/lib/power-move-data";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getEntitlement, runAnalysis } from "@/lib/moveiq.functions";
import { SITUATION_TYPES, URGENCIES } from "@/lib/moveiq-schema";
export const Route = createFileRoute("/analyze")({
  validateSearch: (s: Record<string, unknown>) => ({
    prompt: typeof s["prompt"] === "string" ? s["prompt"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Analyze — Power Move IQ" },
      {
        name: "description",
        content: "Map a difficult situation and choose your strongest next move.",
      },
      { property: "og:title", content: "Analyze — Power Move IQ" },
      {
        property: "og:description",
        content: "A structured decision read, power map, script, and countermoves.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analyze,
});
type Ent = { tier: "free" | "pro"; usedThisMonth: number; freeLimit: number };
function Analyze() {
  const { prompt } = Route.useSearch();
  const [text, setText] = useState(prompt);
  const [type, setType] = useState<(typeof SITUATION_TYPES)[number]>("Client negotiation");
  const [urgency, setUrgency] = useState<(typeof URGENCIES)[number]>("Decision this week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ent, setEnt] = useState<Ent | null>(null);
  const nav = useNavigate();
  const { user, ready } = useAuthUser();
  const run = useServerFn(runAnalysis);
  const entFn = useServerFn(getEntitlement);
  useEffect(() => {
    if (user)
      void entFn()
        .then(setEnt)
        .catch(() => setEnt(null));
  }, [user, entFn]);
  const tooShort = text.trim().length < 40;
  async function submit() {
    if (tooShort || loading) return;
    setLoading(true);
    setError("");
    try {
      const r = await run({ data: { situation: text, type, urgency } });
      if (r.ok) await nav({ to: "/analysis/$caseId", params: { caseId: r.id } });
      else setError(r.error);
    } catch {
      setError("The analysis could not be completed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }
  const outOfFree = ent?.tier === "free" && ent.usedThisMonth >= ent.freeLimit;
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="MOVE IQ™ ANALYSIS"
        title="Read the room. Then move."
        intro="Describe what happened, what you need, and what feels uncertain. Clear details produce a sharper strategic read."
      />
      <div className="analyze-grid">
        <div className="prompt-box">
          <label htmlFor="situation">YOUR SITUATION</label>
          <textarea
            id="situation"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={6000}
            placeholder="A client expanded the scope after approving my fee. They’re implying this should be included, and I don’t want to damage the relationship..."
          />
          <div className="form-row">
            <select
              className="field"
              aria-label="Situation type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              {SITUATION_TYPES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              className="field"
              aria-label="Urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as typeof urgency)}
            >
              {URGENCIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          {ready && !user ? (
            <div className="grid gap-3">
              <div className="auth-msg">
                Sign in to analyze your own situation. Free accounts include limited MOVE IQ
                analyses each month.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="lg">
                  <Link to="/auth">SIGN IN / CREATE ACCOUNT</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/analysis/$caseId" params={{ caseId: "sample" }}>
                    VIEW A SAMPLE ANALYSIS
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button size="lg" onClick={submit} disabled={tooShort || loading || outOfFree}>
                {loading ? "MAPPING THE SITUATION…" : error ? "TRY AGAIN" : "ANALYZE MY SITUATION"}{" "}
                {!loading && <ArrowRight />}
              </Button>
              {text.trim().length > 0 && tooShort && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Add a little more detail — at least 40 characters.
                </p>
              )}
              {ent?.tier === "free" && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Free plan: {Math.min(ent.usedThisMonth, ent.freeLimit)} of {ent.freeLimit} limited
                  analyses used this month.{" "}
                  <Link to="/pricing" className="text-link">
                    Pro unlocks the full read.
                  </Link>
                </p>
              )}
              {error && (
                <div className="auth-msg mt-4" role="alert">
                  {error}
                </div>
              )}
            </>
          )}
          <p className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck className="size-3" /> Your private cases are only visible to you.
          </p>
          <div className="mt-8">
            <p className="eyebrow">QUICK START</p>
            <div className="flex flex-wrap gap-2">
              {situations.slice(0, 5).map((s) => (
                <button
                  key={s}
                  className="situation-chip bg-transparent"
                  onClick={() => setText(s + ". ")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="analyze-aside">
          <p className="eyebrow">YOUR ANALYSIS</p>
          <ol>
            {[
              "The Read",
              "Counterpart IQ",
              "Power Map",
              "The Move",
              "Script Modes",
              "Countermoves",
              "The Second Move",
              "Don’t Do This",
              "The Precedent",
              "Exit Line",
              "Outcome Memory",
            ].map((x, i) => (
              <li key={x}>
                {String(i + 1).padStart(2, "0")} &nbsp; {x}
              </li>
            ))}
          </ol>
          <p className="text-xs leading-6 text-muted-foreground">
            Educational decision-support. Not legal, financial, or employment advice.
          </p>
        </aside>
      </div>
    </div>
  );
}
