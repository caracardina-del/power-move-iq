import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
import { situations } from "@/lib/power-move-data";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getEntitlement, runAnalysis } from "@/lib/moveiq.functions";
import { runGuestAnalysis } from "@/lib/guest.functions";
import { SITUATION_TYPES, URGENCIES } from "@/lib/moveiq-schema";
import { clearDraft, readDraft, readGuest, writeDraft, writeGuest } from "@/lib/guest-store";

const RETURN_KEY = "pmiq:return-after-auth";
const RESUME_KEY = "pmiq:resume-analysis";

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
type SType = (typeof SITUATION_TYPES)[number];
type Urg = (typeof URGENCIES)[number];

function Analyze() {
  const { prompt } = Route.useSearch();
  const [text, setText] = useState("");
  const [type, setType] = useState<SType>("Other");
  const [urgency, setUrgency] = useState<Urg>("Exploring options");
  const [hydrated, setHydrated] = useState(false);
  const [pendingQuick, setPendingQuick] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [loading]);
  const [error, setError] = useState("");
  const [needsAccount, setNeedsAccount] = useState(false);
  const [ent, setEnt] = useState<Ent | null>(null);
  const resumed = useRef(false);
  const inFlight = useRef(false);
  const nav = useNavigate();
  const { user, ready } = useAuthUser();
  const run = useServerFn(runAnalysis);
  const runGuest = useServerFn(runGuestAnalysis);
  const entFn = useServerFn(getEntitlement);

  // Restore the latest draft once; the newest saved text always wins.
  useEffect(() => {
    const d = readDraft();
    let t = d?.situation ?? "";
    if (d) {
      setText(t);
      setType(d.type);
      setUrgency(d.urgency);
    }
    if (prompt) {
      if (!t.trim()) {
        t = `${prompt}. `;
        setText(t);
      } else setPendingQuick(prompt);
      void nav({ to: "/analyze", search: { prompt: "" }, replace: true });
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated) writeDraft({ situation: text, type, urgency });
  }, [hydrated, text, type, urgency]);

  useEffect(() => {
    if (user)
      void entFn()
        .then(setEnt)
        .catch(() => setEnt(null));
  }, [user, entFn]);

  async function runSigned(draft: { situation: string; type: SType; urgency: Urg }) {
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await run({ data: draft });
      if (result.ok) {
        clearDraft();
        await nav({ to: "/analysis/$caseId", params: { caseId: result.id } });
      } else setError(result.error);
    } catch {
      setError("The analysis could not be completed. Check your connection or sign in again, then retry.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  // After signing in from this page, continue with the saved draft once.
  useEffect(() => {
    if (!hydrated || !ready || !user || resumed.current) return;
    if (window.sessionStorage.getItem(RESUME_KEY) !== "1") return;
    resumed.current = true;
    window.sessionStorage.removeItem(RESUME_KEY);
    const d = readDraft();
    if (!d || d.situation.trim().length < 40 || inFlight.current) return;
    void runSigned({ situation: d.situation.trim(), type: d.type, urgency: d.urgency });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, ready, user]);

  const tooShort = text.trim().length < 40;

  function goCreateAccount() {
    window.sessionStorage.setItem(RETURN_KEY, "analyze");
    void nav({ to: "/auth" });
  }

  async function submit() {
    if (loading || inFlight.current || !ready) return;
    if (outOfFree) {
      setError("You have used your free analyses for this month. Pro unlocks the full read.");
      return;
    }
    if (tooShort) {
      setError("Add who is involved, what happened, and what you want next (at least 40 characters).");
      return;
    }
    setError("");
    setNeedsAccount(false);
    const draft = { situation: text.trim(), type, urgency };
    writeDraft(draft);

    if (user) return runSigned(draft);

    const prior = readGuest();
    if (prior) {
      if (prior.situation === draft.situation)
        return void nav({ to: "/analysis/$caseId", params: { caseId: "guest" } });
      setNeedsAccount(true);
      setError("Your free analysis has been used. Create a free account to analyze another situation.");
      return;
    }
    inFlight.current = true;
    setLoading(true);
    try {
      const r = await runGuest({ data: draft });
      if (r.ok) {
        writeGuest({
          token: r.token,
          situation: draft.situation,
          type: draft.type,
          urgency: draft.urgency,
          analysis: r.analysis,
          createdAt: Date.now(),
        });
        await nav({ to: "/analysis/$caseId", params: { caseId: "guest" } });
      } else {
        setError(r.error);
        if (r.code !== "error") setNeedsAccount(true);
      }
    } catch {
      setError("The analysis could not be completed. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  function quick(s: string) {
    setError("");
    if (!text.trim()) {
      setText(`${s}. `);
      document.getElementById("situation")?.focus();
    } else setPendingQuick(s);
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
          {pendingQuick && (
            <div className="auth-msg mt-3" role="dialog" aria-label="Replace your text?">
              <p className="text-sm">Replace your current text with “{pendingQuick}”?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setText(`${pendingQuick}. `);
                    setPendingQuick(null);
                    document.getElementById("situation")?.focus();
                  }}
                >
                  REPLACE
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPendingQuick(null);
                    document.getElementById("situation")?.focus();
                  }}
                >
                  KEEP EDITING
                </Button>
              </div>
            </div>
          )}
          <div className="form-row">
            <select
              className="field"
              aria-label="Situation type"
              value={type}
              onChange={(e) => setType(e.target.value as SType)}
            >
              {SITUATION_TYPES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              className="field"
              aria-label="Urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as Urg)}
            >
              {URGENCIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <Button size="lg" onClick={submit} disabled={loading || !ready} aria-busy={loading}>
            {loading && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {loading ? "ANALYZING YOUR SITUATION…" : error && !needsAccount ? "RETRY" : "ANALYZE MY SITUATION"}{" "}
            {!loading && <ArrowRight />}
          </Button>
          {loading && (
            <div className="mt-4 border border-primary/40 p-4" role="status" aria-live="polite" aria-atomic="true">
              <p className="text-sm text-foreground">{elapsed < 30 ? "Your analysis is running. You can stay on this page while PMIQ prepares your recommendation." : "Still working on your analysis. Some situations take longer; please keep this page open."}</p>
              <p className="mt-2 text-xs text-muted-foreground" aria-live="off">{elapsed}s elapsed · Your situation is preserved. No need to submit again.</p>
            </div>
          )}
          {!user && ready && (
            <p className="mt-3 text-xs text-muted-foreground">
              Your first analysis is free — no account needed. Create a free account afterward to save it.
            </p>
          )}
          {text.trim().length > 0 && tooShort && (
            <p className="mt-3 text-xs text-muted-foreground">
              Add who is involved, what happened, and what you want next — {text.trim().length}/40 characters.
            </p>
          )}
          {ent?.tier === "free" && (
            <p className="mt-3 text-xs text-muted-foreground">
              Free plan: {Math.min(ent.usedThisMonth, ent.freeLimit)} of {ent.freeLimit} limited analyses used this
              month.{" "}
              <Link to="/pricing" className="text-link">
                Pro unlocks the full read.
              </Link>
            </p>
          )}
          {error && (
            <div className="auth-msg mt-4" role="alert">
              {error}
              {needsAccount && (
                <div className="mt-3">
                  <Button size="sm" onClick={goCreateAccount}>
                    CREATE FREE ACCOUNT
                  </Button>
                </div>
              )}
              {outOfFree && (
                <div className="mt-3">
                  <Button size="sm" asChild>
                    <Link to="/pricing">VIEW PRO</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
          <p className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck className="size-3" /> Your situation is processed to generate your analysis and stored
            privately so you can save it after sign-in. Never in a public link.
          </p>
          <div className="mt-8">
            <p className="eyebrow">QUICK START</p>
            <div className="flex flex-wrap gap-2">
              {situations.slice(0, 5).map((s) => (
                <button key={s} className="situation-chip bg-transparent" onClick={() => quick(s)}>
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
            Free reads include The Read, The Move, and Don’t Do This. Pro unlocks every layer. Educational
            decision-support. Not legal, financial, or employment advice.
          </p>
        </aside>
      </div>
    </div>
  );
}
