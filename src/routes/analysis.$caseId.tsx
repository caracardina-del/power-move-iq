import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatePanel, ProLock } from "@/components/power/ui";
import { resultLayers } from "@/lib/power-move-data";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getCase, recordOutcome, runAnalysis } from "@/lib/moveiq.functions";
import { claimGuestAnalysis } from "@/lib/guest.functions";
import { clearGuest, readGuest, type GuestResult } from "@/lib/guest-store";
import { useNavigate } from "@tanstack/react-router";
import { GOAL_OPTIONS, SITUATION_TYPES, type FullAnalysis, type LimitedAnalysis } from "@/lib/moveiq-schema";
import { correctClassification, setCaseArchived } from "@/lib/moveiq.functions";
import { createPlanFromCase } from "@/lib/plans.functions";

export const Route = createFileRoute("/analysis/$caseId")({
  head: () => ({
    meta: [
      { title: "Your MOVE IQ Analysis — Power Move IQ" },
      { name: "description", content: "A structured strategic read and recommended next move." },
      { property: "og:title", content: "Your MOVE IQ Analysis" },
      {
        property: "og:description",
        content: "The Read, Power Map, strongest moves, script, and countermoves.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Result,
});

type CaseData = Awaited<ReturnType<typeof getCase>>;

function Layer({
  n,
  k,
  title,
  tone,
  children,
}: {
  n: number;
  k: string;
  title: string;
  tone?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`layer ${tone ?? ""}`}>
      <div className="layer-number">{String(n).padStart(2, "0")}</div>
      <div className="layer-key">{k}</div>
      <div className="layer-content">
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}
function Bullets({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-5">
      <p className="eyebrow">{label}</p>
      <ul className="grid gap-2 text-sm leading-7 opacity-85">
        {items.map((x, i) => (
          <li key={i}>— {x}</li>
        ))}
      </ul>
    </div>
  );
}
function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div>
      {rows.map(([a, b], i) => (
        <div className="counter-row" key={i}>
          <span>{a}</span>
          <span>{b}</span>
        </div>
      ))}
    </div>
  );
}

function Result() {
  const { caseId } = Route.useParams();
  if (caseId === "sample") return <Sample />;
  if (caseId === "guest") return <GuestCase />;
  return <RealCase id={caseId} />;
}

function Sample() {
  return (
    <div className="page-shell">
      <header className="result-header">
        <p className="eyebrow">SAMPLE ANALYSIS · NOT YOUR SITUATION</p>
        <h1>The scope changed. Your price doesn’t have to stay still.</h1>
        <div className="auth-msg mt-4">
          This is a fixed example showing the format. Sign in to analyze your own situation.
        </div>
        <div className="mt-6 flex gap-2">
          <Button asChild>
            <Link to="/auth">SIGN IN TO ANALYZE</Link>
          </Button>
        </div>
      </header>
      {resultLayers
        .filter((l) => !l.outcome)
        .map((l) => (
          <section key={l.n} className={`layer ${l.tone ?? ""}`}>
            <div className="layer-number">{l.n}</div>
            <div className="layer-key">{l.key}</div>
            <div className="layer-content">
              <h2>{l.title}</h2>
              {l.body && <p>{l.body}</p>}
              {l.callout && <div className="layer-callout">{l.callout}</div>}
              {l.rows && <Rows rows={l.rows as [string, string][]} />}
            </div>
          </section>
        ))}
    </div>
  );
}

function GuestCase() {
  const { user, ready } = useAuthUser();
  const nav = useNavigate();
  const claim = useServerFn(claimGuestAnalysis);
  const [g, setG] = useState<GuestResult | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => setG(readGuest()), []);
  async function save() {
    if (!g || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await claim({ data: { token: g.token } });
      if (r.ok) {
        clearGuest();
        await nav({ to: "/analysis/$caseId", params: { caseId: r.id }, replace: true });
      } else setMsg(r.error);
    } catch {
      setMsg("Your result could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function toAuth() {
    window.sessionStorage.setItem("pmiq:return-after-auth", "claim");
    void nav({ to: "/auth" });
  }
  if (g === undefined)
    return (
      <div className="page-shell">
        <StatePanel type="loading" title="Opening your free analysis" body="One moment." />
      </div>
    );
  if (!g)
    return (
      <div className="page-shell">
        <StatePanel
          title="No free analysis on this device"
          body="It may have been saved to your account already, or it was created on another device."
        >
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/analyze" search={{ prompt: "" }}>ANALYZE MY SITUATION</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/saved">SAVED CASES</Link>
            </Button>
          </div>
        </StatePanel>
      </div>
    );
  return (
    <div className="page-shell">
      <header className="result-header">
        <p className="eyebrow">MOVE IQ™ · YOUR FREE ANALYSIS</p>
        <h1>{g.analysis.title}</h1>
        <div className="result-meta">
          <span>{g.type}</span>
          <span>{g.urgency}</span>
          <span>Not saved yet · on this device only</span>
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">“{g.situation}”</p>
        <div className="auth-msg mt-6">
          {user
            ? "Save this read to your private account to keep it, follow up, and record the outcome."
            : "Create a free account to save this read, analyze another situation, or follow up later. Your result carries over."}
          <div className="mt-4 flex flex-wrap gap-2">
            {user ? (
              <Button onClick={save} disabled={busy || !ready}>
                {busy ? "SAVING…" : "SAVE TO MY ACCOUNT"}
              </Button>
            ) : (
              <>
                <Button onClick={toAuth} disabled={!ready}>CREATE FREE ACCOUNT TO SAVE</Button>
                <Button variant="ghost" onClick={toAuth} disabled={!ready}>
                  I HAVE AN ACCOUNT
                </Button>
              </>
            )}
          </div>
          {msg && <p className="mt-3 text-sm" role="alert">{msg}</p>}
        </div>
      </header>
      <Limited a={g.analysis} tier="free" />
      <p className="mt-10 text-xs leading-6 text-muted-foreground">
        Educational decision-support generated from your description. Not legal, financial, or
        employment advice, and no outcome is guaranteed.
      </p>
    </div>
  );
}

function RealCase({ id }: { id: string }) {
  const { user, ready } = useAuthUser();
  const fetchCase = useServerFn(getCase);
  const [data, setData] = useState<CaseData | null>(null);
  const [err, setErr] = useState(false);
  const load = useCallback(() => {
    setErr(false);
    fetchCase({ data: { id } })
      .then(setData)
      .catch(() => setErr(true));
  }, [fetchCase, id]);
  useEffect(() => {
    if (user) load();
  }, [user, load]);
  if (ready && !user)
    return (
      <div className="page-shell">
        <StatePanel
          title="Sign in to view this case"
          body="Cases are private to the account that created them."
        >
          <Button asChild>
            <Link to="/auth">SIGN IN</Link>
          </Button>
        </StatePanel>
      </div>
    );
  if (err)
    return (
      <div className="page-shell">
        <StatePanel
          type="error"
          title="This case could not be loaded"
          body="Check your connection and try again."
        >
          <Button onClick={load}>RETRY</Button>
        </StatePanel>
      </div>
    );
  if (!data)
    return (
      <div className="page-shell">
        <StatePanel type="loading" title="Opening your case" body="Retrieving the analysis." />
      </div>
    );
  if (!data.found)
    return (
      <div className="page-shell">
        <StatePanel
          title="Case not found"
          body="It may have been removed, or it belongs to another account."
        >
          <Button asChild>
            <Link to="/analyze" search={{ prompt: "" }}>
              NEW ANALYSIS
            </Link>
          </Button>
        </StatePanel>
      </div>
    );
  const { row, tier, outcomes } = data;
  const res = row.result;
  const date = new Date(row.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="page-shell">
      <header className="result-header">
        <p className="eyebrow">
          MOVE IQ™ · {res.tier === "pro" ? "FULL ANALYSIS" : "LIMITED FREE ANALYSIS"}
        </p>
        <h1>{row.title}</h1>
        <div className="result-meta">
          {row.context.type && <span>{row.context.type}</span>}
          {row.context.urgency && <span>{row.context.urgency}</span>}
          <span>{date}</span>
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">“{row.situation}”</p>
        <CaseTools caseId={row.id} isPro={tier === "pro" && res.tier === "pro"} status={row.status} classification={row.classification} fallbackType={row.context.type} primaryRef={res.analysis.move_refs?.primary ?? null} onChange={onChange} />
        {row.context.parent_id && (
          <p className="mt-3 text-xs">
            Follow-up to{" "}
            <Link to="/analysis/$caseId" params={{ caseId: row.context.parent_id }} className="text-link">
              the original case
            </Link>
          </p>
        )}
        <div className="mt-7 flex gap-2">
          <Button variant="ghost" asChild>
            <Link to="/analyze" search={{ prompt: "" }}>
              <RotateCcw /> NEW ANALYSIS
            </Link>
          </Button>
        </div>
      </header>
      {res.tier === "pro" ? (
        <Full a={res.analysis} caseId={row.id} outcomes={outcomes} onChange={load} />
      ) : (
        <Limited a={res.analysis} tier={tier} />
      )}
      <p className="mt-10 text-xs leading-6 text-muted-foreground">
        Educational decision-support generated from your description. Not legal, financial, or
        employment advice, and no outcome is guaranteed.
      </p>
    </div>
  );
}

function ReadLayer({ a, n }: { a: LimitedAnalysis; n: number }) {
  return (
    <Layer n={n} k="THE READ™" title={a.read.headline} tone="dark">
      <Bullets label="FACTS" items={a.read.facts} />
      <Bullets label="ASSUMPTIONS" items={a.read.assumptions} />
      <Bullets label="SIGNALS" items={a.read.signals} />
      <Bullets label="UNKNOWNS" items={a.read.unknowns} />
    </Layer>
  );
}

function Limited({ a, tier }: { a: LimitedAnalysis; tier: "free" | "pro" }) {
  return (
    <>
      <ReadLayer a={a} n={1} />
      <Layer n={2} k="THE MOVE™" title={a.move.headline}>
        <p>{a.move.recommended}</p>
      </Layer>
      <Layer n={3} k="DON’T DO THIS™" title={a.dont_do.action} tone="warning">
        <p>{a.dont_do.why}</p>
      </Layer>
      <section className="layer">
        <div className="layer-number">—</div>
        <div className="layer-key">
          <ProLock text="PRO" />
        </div>
        <div className="layer-content">
          <h2>The rest of the read is included with Pro.</h2>
          <p>
            Counterpart IQ, Power Map, alternatives, Script Modes, Countermoves, The Second Move,
            The Precedent, Exit Line, saved cases, and Outcome Memory.
          </p>
          {tier === "pro" ? (
            <p className="mt-4 text-sm">
              This case was created on the free plan. Run a new analysis for the full read.
            </p>
          ) : (
            <Button asChild className="mt-5">
              <Link to="/pricing">VIEW PRO</Link>
            </Button>
          )}
        </div>
      </section>
    </>
  );
}

function Full({
  a,
  caseId,
  outcomes,
  onChange,
}: {
  a: FullAnalysis;
  caseId: string;
  outcomes: {
    id: string;
    outcome: string;
    chosen_move: string | null;
    result_note: string;
    recorded_at: string;
  }[];
  onChange: () => void;
}) {
  let n = 1;
  return (
    <>
      <ReadLayer a={a} n={n++} />
      <Layer n={n++} k="COUNTERPART IQ™" title={a.counterpart.headline}>
        <p className="text-xs text-muted-foreground">
          Observable negotiating behavior only — not a judgment of character.
        </p>
        {a.counterpart.behaviors.map((b, i) => (
          <div className="counter-row" key={i}>
            <span>
              {b.pattern}{" "}
              <small className="text-muted-foreground">· {b.confidence} confidence</small>
            </span>
            <span>{b.evidence}</span>
          </div>
        ))}
        {a.counterpart.uncertainty && (
          <div className="layer-callout">{a.counterpart.uncertainty}</div>
        )}
      </Layer>
      <Layer n={n++} k="POWER MAP™" title={a.power_map.headline}>
        <Bullets label="YOUR LEVERAGE" items={a.power_map.your_leverage} />
        <Bullets label="THEIR LEVERAGE" items={a.power_map.their_leverage} />
        <Bullets label="CONSTRAINTS" items={a.power_map.constraints} />
        <Bullets label="UNKNOWNS" items={a.power_map.unknowns} />
      </Layer>
      <Layer n={n++} k="THE MOVE™" title={a.move.headline}>
        <p>{a.move.recommended}</p>
        {a.move.rationale && <p className="mt-4">{a.move.rationale}</p>}
        {a.move.alternatives.length > 0 && (
          <>
            <p className="eyebrow mt-6">ALTERNATIVES & TRADEOFFS</p>
            <Rows rows={a.move.alternatives.map((x) => [x.option, x.tradeoff])} />
          </>
        )}
        {a.move.confidence_note && <div className="layer-callout">{a.move.confidence_note}</div>}
      </Layer>
      <Layer n={n++} k="SCRIPT MODES™" title="The same strategy, three registers.">
        <Rows
          rows={[
            ["Diplomatic", a.scripts.diplomatic],
            ["Direct", a.scripts.direct],
            ["Hard line", a.scripts.hard_line],
          ]}
        />
      </Layer>
      <Layer n={n++} k="COUNTERMOVES™" title="Prepare for the next sentence.">
        <Rows
          rows={a.countermoves.map((c) => [
            `If they ${c.if_they.replace(/^if they\s*/i, "")}`,
            c.consider,
          ])}
        />
      </Layer>
      <Layer n={n++} k="THE SECOND MOVE™" title="What comes after the first move.">
        <Rows
          rows={[
            ["If it works", a.second_move.if_success],
            ["If it fails", a.second_move.if_failure],
            ["If there’s no response", a.second_move.if_no_response],
          ]}
        />
      </Layer>
      <Layer n={n++} k="DON’T DO THIS™" title={a.dont_do.action} tone="warning">
        <p>{a.dont_do.why}</p>
      </Layer>
      {a.precedent.include && a.precedent.name && a.precedent.source ? (
        <Layer n={n++} k="THE PRECEDENT™" title={a.precedent.name}>
          {a.precedent.what_happened && <p>{a.precedent.what_happened}</p>}
          <Rows
            rows={[
              ["Principle", a.precedent.principle ?? ""],
              ["Why it parallels", a.precedent.parallel ?? ""],
              ["Where it breaks down", a.precedent.breaks_down ?? ""],
              ["Source", a.precedent.source ?? ""],
            ]}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            AI-selected precedent. Verify historical details independently before relying on them.
          </p>
        </Layer>
      ) : (
        <Layer n={n++} k="THE PRECEDENT™" title="No precedent offered.">
          <p>
            {a.precedent.omitted_reason ||
              "No sufficiently well-documented parallel was found, so none is offered rather than guessing."}
          </p>
        </Layer>
      )}
      <Layer
        n={n++}
        k="EXIT LINE™"
        title="When stepping back is reasonable."
      >
        <Bullets label="CONDITIONS" items={a.exit_line.conditions} />
        {a.exit_line.line && (
          <blockquote className="exit-quote">{a.exit_line.line}</blockquote>
        )}
      </Layer>
      <Layer n={n++} k="OUTCOME MEMORY™" title="Close the loop. Build your judgment.">
        <OutcomeForm
          caseId={caseId}
          defaultMove={a.move.headline}
          outcomes={outcomes}
          onSaved={onChange}
        />
      </Layer>
    </>
  );
}

function OutcomeForm({
  caseId,
  defaultMove,
  outcomes,
  onSaved,
}: {
  caseId: string;
  defaultMove: string;
  outcomes: {
    id: string;
    outcome: string;
    chosen_move: string | null;
    result_note: string;
    recorded_at: string;
  }[];
  onSaved: () => void;
}) {
  const rec = useServerFn(recordOutcome);
  const follow = useServerFn(runAnalysis);
  const [move, setMove] = useState(defaultMove);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [update, setUpdate] = useState("");
  async function save(outcome: "accepted" | "negotiated" | "declined" | "ghosted" | "other") {
    setBusy(true);
    setMsg("");
    try {
      const r = await rec({ data: { analysisId: caseId, outcome, chosenMove: move, note } });
      if (r.ok) {
        setNote("");
        setMsg("Outcome recorded.");
        onSaved();
      } else setMsg(r.error);
    } catch {
      setMsg("The outcome could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function runFollow() {
    if (update.trim().length < 40) {
      setMsg("Describe what happened in at least 40 characters.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await follow({
        data: {
          situation: update,
          type: "Other",
          urgency: "Decision this week",
          parentId: caseId,
          update,
        },
      });
      if (r.ok) window.location.assign(`/analysis/${r.id}`);
      else setMsg(r.error);
    } catch {
      setMsg("The follow-up could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-2" htmlFor="chosen">
        Move you chose
      </label>
      <input
        id="chosen"
        className="field w-full"
        value={move}
        onChange={(e) => setMove(e.target.value)}
      />
      <label className="mt-4 block text-xs text-muted-foreground mb-2" htmlFor="note">
        What happened (optional)
      </label>
      <textarea
        id="note"
        className="field w-full min-h-20"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="outcome-actions">
        {(["accepted", "negotiated", "declined", "ghosted", "other"] as const).map((x) => (
          <button disabled={busy} onClick={() => save(x)} key={x}>
            {x}
          </button>
        ))}
      </div>
      {msg && (
        <div className="layer-callout" role="status">
          {msg}
        </div>
      )}
      {outcomes.length > 0 && (
        <div className="mt-6">
          {outcomes.map((o) => (
            <div className="counter-row" key={o.id}>
              <span>
                {o.outcome.toUpperCase()} · {new Date(o.recorded_at).toLocaleDateString()}
              </span>
              <span>
                {o.chosen_move}
                {o.result_note ? ` — ${o.result_note}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="eyebrow mt-8">FOLLOW-UP ANALYSIS</p>
      <textarea
        className="field w-full min-h-24"
        placeholder="What did they say or do next?"
        value={update}
        onChange={(e) => setUpdate(e.target.value)}
      />
      <Button className="mt-3" variant="editorial" disabled={busy} onClick={runFollow}>
        {busy ? "WORKING…" : "ANALYZE THE NEXT MOVE"}
      </Button>
    </div>
  );
}

function CaseTools({ caseId, isPro, status, classification, fallbackType, primaryRef, onChange }: {
  caseId: string; isPro: boolean; status: string; classification: { situation?: string; goal?: string; corrected_at?: string };
  fallbackType?: string; primaryRef: string | null; onChange: () => void;
}) {
  const navigate = useNavigate();
  const mkPlan = useServerFn(createPlanFromCase);
  const correct = useServerFn(correctClassification);
  const archive = useServerFn(setCaseArchived);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [sit, setSit] = useState(classification.situation ?? fallbackType ?? "Other");
  const [goal, setGoal] = useState<string>(classification.goal ?? "");
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => {
    if (busy) return; setBusy(true); setMsg("");
    try { const r = await fn(); if (!r.ok) setMsg(r.error ?? "Something went wrong."); else { if (done) setMsg(done); onChange(); } }
    catch { setMsg("Network problem — please try again."); } finally { setBusy(false); }
  };
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
      {isPro && status !== "archived" && (
        <Button size="sm" disabled={busy} onClick={async () => {
          if (busy) return; setBusy(true); setMsg("");
          try { const r = await mkPlan({ data: { analysisId: caseId } }); if (r.ok) navigate({ to: "/plans/$planId", params: { planId: r.id } }); else setMsg(r.error); }
          catch { setMsg("The plan could not be created. Try again."); } finally { setBusy(false); }
        }}>{busy ? "OPENING…" : "EDIT AS MOVE PLAN"}</Button>
      )}
      {primaryRef && <span className="text-xs">Grounded in catalog Move {primaryRef.replace("mv_", "#")}</span>}
      <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>{classification.corrected_at ? "SITUATION: CORRECTED" : "CORRECT THE SITUATION TYPE"}</Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => archive({ data: { id: caseId, archived: status !== "archived" } }), status === "archived" ? "Case restored." : "Case archived. Nothing was deleted.")}>
        {status === "archived" ? "RESTORE CASE" : "ARCHIVE CASE"}</Button>
      {editing && (
        <div className="grid w-full gap-2 rounded border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-1 text-xs">Situation<select className="field" value={sit} onChange={(e) => setSit(e.target.value)}>{SITUATION_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="grid gap-1 text-xs">Goal<select className="field" value={goal} onChange={(e) => setGoal(e.target.value)}><option value="">Not specified</option>{GOAL_OPTIONS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
          <Button size="sm" className="self-end" disabled={busy} onClick={() => run(() => correct({ data: { id: caseId, situation: sit as (typeof SITUATION_TYPES)[number], goal: goal || null } }), "Correction saved. Your original text is unchanged.").then(() => setEditing(false))}>SAVE</Button>
        </div>
      )}
      {msg && <p role="status" className="w-full text-xs">{msg}</p>}
    </div>
  );
}
