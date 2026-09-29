import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
import { situations } from "@/lib/power-move-data";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getEntitlement, runAnalysis } from "@/lib/moveiq.functions";
import { SITUATION_TYPES, URGENCIES } from "@/lib/moveiq-schema";

const PENDING_KEY = "pmiq:pending-analysis";
const RETURN_KEY = "pmiq:return-after-auth";
const RESUME_KEY = "pmiq:resume-analysis";

type PendingAnalysis = {
  situation: string;
  type: (typeof SITUATION_TYPES)[number];
  urgency: (typeof URGENCIES)[number];
};

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

function readPending(): PendingAnalysis | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingAnalysis) : null;
  } catch {
    return null;
  }
}

function Analyze() {
  const { prompt } = Route.useSearch();
  const pending = readPending();
  const [text, setText] = useState(prompt || pending?.situation || "");
  const [type, setType] = useState<(typeof SITUATION_TYPES)[number]>(pending?.type || "Client negotiation");
  const [urgency, setUrgency] = useState<(typeof URGENCIES)[number]>(pending?.urgency || "Decision this week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ent, setEnt] = useState<Ent | null>(null);
  const [shouldResume] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem(RESUME_KEY) === "1",
  );
  const resumed = useRef(false);
  const nav = useNavigate();
  const { user, ready } = useAuthUser();
  const run = useServerFn(runAnalysis);
  const entFn = useServerFn(getEntitlement);

  useEffect(() => {
    const draft = window.sessionStorage.getItem("pmiq:home-draft");
    if (draft) setText(draft);
  }, []);

  useEffect(() => {
    if (user)
      void entFn()
        .then(setEnt)
        .catch(() => setEnt(null));
  }, [user, entFn]);

  useEffect(() => {
    if (!shouldResume || !ready || !user || resumed.current) return;
    const draft = readPending();
    if (!draft || draft.situation.trim().length < 40) return;
    resumed.current = true;
    window.sessionStorage.removeItem(RESUME_KEY);
    setText(draft.situation);
    setType(draft.type);
    setUrgency(draft.urgency);
    setLoading(true);
    setError("");
    void run({ data: draft })
      .then(async (result) => {
        if (result.ok) {
          window.sessionStorage.removeItem(PENDING_KEY);
          await nav({ to: "/analysis/$caseId", params: { caseId: result.id } });
        } else {
          setError(result.error);
        }
      })
      .catch(() => setError("The analysis could not be completed. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [shouldResume, ready, user, run, nav]);

  const tooShort = text.trim().length < 40;

  async function submit() {
    if (tooShort || loading || !ready) return;
    window.sessionStorage.removeItem("pmiq:home-draft");
    setError("");
    const draft: PendingAnalysis = { situation: text.trim(), type, urgency };

    if (!user) {
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(draft));
      window.sessionStorage.setItem(RETURN_KEY, "analyze");
      await nav({ to: "/auth" });
      return;
    }

    setLoading(true);
    try {
      const result = await run({ data: draft });
      if (result.ok) {
        window.sessionStorage.removeItem(PENDING_KEY);
        await nav({ to: "/analysis/$caseId", params: { caseId: result.id } });
      } else setError(result.error);
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
          <Button size="lg" onClick={submit} disabled={tooShort || loading || outOfFree || !ready}>
            {loading
              ? "MAPPING THE SITUATION…"
              : error
                ? "TRY AGAIN"
                : user
                  ? "ANALYZE MY SITUATION"
                  : "CREATE ACCOUNT TO GET MY READ"}{" "}
            {!loading && <ArrowRight />}
          </Button>
          {!user && ready && (
            <p className="mt-3 text-xs text-muted-foreground">
              No card required · Three introductory strategic reads included each month.
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
            </div>
          )}
          <p className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck className="size-3" /> Your private cases are only visible to you.
          </p>
          <div className="mt-8">
            <p className="eyebrow">QUICK START</p>
            <div className="flex flex-wrap gap-2">
              {situations.slice(0, 5).map((s) => (
                <button key={s} className="situation-chip bg-transparent" onClick={() => setText(s + ". ")}>
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
