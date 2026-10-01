import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/power/ui";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getPlan, savePlanDraft, savePlanVersion, setPlanStatus, type PlanContent } from "@/lib/plans.functions";

export const Route = createFileRoute("/plans/$planId")({
  head: () => ({
    meta: [
      { title: "Move Plan — Power Move IQ" },
      { name: "description", content: "Your private, editable Move Plan with version history." },
      { property: "og:title", content: "Move Plan — Power Move IQ" },
      { property: "og:description", content: "Private Move Plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlanPage,
});

type Data = Awaited<ReturnType<typeof getPlan>>;
const MODES = [["diplomatic", "Diplomatic"], ["direct", "Direct"], ["hard_line", "Hard line"], ["custom", "My own"]] as const;
const SOURCE_LABEL = { original: "Original recommendation", edit: "Your edit", alternative: "Chosen alternative", restore: "Restored" } as const;

function PlanPage() {
  const { planId } = Route.useParams();
  const { user, ready } = useAuthUser();
  const fetchPlan = useServerFn(getPlan);
  const draftFn = useServerFn(savePlanDraft);
  const versionFn = useServerFn(savePlanVersion);
  const statusFn = useServerFn(setPlanStatus);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  const [c, setC] = useState<PlanContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [autosave, setAutosave] = useState("");
  const [recovered, setRecovered] = useState(false);

  const load = useCallback(() => {
    setErr(false);
    fetchPlan({ data: { id: planId } })
      .then((r) => {
        setD(r);
        if (r.found) {
          const latest = r.versions[0]?.content ?? null;
          const draftNewer = r.plan.draft && r.plan.draft_saved_at && (!r.versions[0] || r.plan.draft_saved_at > r.versions[0].created_at);
          setC(draftNewer ? r.plan.draft : latest);
          setRecovered(!!draftNewer);
          setDirty(false);
        }
      })
      .catch(() => setErr(true));
  }, [fetchPlan, planId]);
  useEffect(() => { if (user) load(); }, [user, load]);

  // Debounced autosave of the working copy (recovery only — not a version).
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!dirty || !c || !d?.found || d.plan.status !== "active" || d.tier !== "pro") return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setAutosave("Saving draft…");
      draftFn({ data: { id: planId, content: c } })
        .then((r) => setAutosave(r.ok ? "Draft saved" : "Draft not saved — your text is still here"))
        .catch(() => setAutosave("Offline — draft not saved yet"));
    }, 1200);
    return () => window.clearTimeout(timer.current);
  }, [c, dirty, d, draftFn, planId]);

  if (ready && !user)
    return <div className="page-shell"><StatePanel title="Sign in to open this plan" body="Move Plans are private to your account."><Button asChild><Link to="/auth">SIGN IN</Link></Button></StatePanel></div>;
  if (err) return <div className="page-shell"><StatePanel type="error" title="This plan could not load" body="Check your connection and try again."><Button onClick={load}>RETRY</Button></StatePanel></div>;
  if (!d || (d.found && !c)) return <div className="page-shell"><StatePanel type="loading" title="Opening your plan" body="One moment." /></div>;
  if (!d.found || !c) return <div className="page-shell"><StatePanel title="Plan not found" body="It may belong to another account."><Button asChild><Link to="/saved">BACK TO SAVED</Link></Button></StatePanel></div>;

  const { plan, versions, alternatives, scripts, tier } = d;
  const cur: PlanContent = c;
  const editable = plan.status === "active" && tier === "pro";
  const set = (patch: Partial<PlanContent>) => { setC({ ...c, ...patch }); setDirty(true); };

  async function saveVersion(content: PlanContent, source: "edit" | "alternative" | "restore", note: string) {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await versionFn({ data: { id: planId, content, expectedVersion: plan.current_version, source, note } });
      if (!r.ok) setMsg(r.error);
      else { setMsg(`Saved as version ${r.version}.`); load(); }
    } catch { setMsg("Could not save. Your text is still here — try again."); }
    finally { setBusy(false); }
  }
  async function toggleArchive() {
    if (busy) return;
    setBusy(true);
    const r = await statusFn({ data: { id: planId, archived: plan.status === "active" } }).catch(() => ({ ok: false as const, error: "Could not update." }));
    setBusy(false);
    if (!r.ok) setMsg(r.error); else load();
  }
  function exportPlan() {
    const c = cur;
    const text = [`MOVE PLAN — ${plan.title}`, `Version ${plan.current_version}`, "", "THE MOVE", c.move, "", "OPENING LINE", c.opening, "", `SCRIPT (${c.mode})`, c.script, "", "STEPS", ...c.steps.map((s, i) => `${i + 1}. ${s}`), "", "NOTES", c.notes, "", "Educational decision support — not legal, financial or employment advice."].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = "move-plan.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link to="/saved" className="underline">Saved</Link>
        {plan.analysis_id && <> <span aria-hidden>›</span> <Link to="/analysis/$caseId" params={{ caseId: plan.analysis_id }} className="underline">Original case</Link></>}
      </nav>
      <p className="eyebrow">MOVE PLAN · VERSION {plan.current_version}{plan.status === "archived" ? " · ARCHIVED" : ""}</p>
      <h1 className="serif m-0 text-3xl leading-tight md:text-4xl">{plan.title}</h1>
      {recovered && <p role="status" className="mt-4 rounded border border-primary p-3 text-sm">Recovered your unsaved draft from {new Date(plan.draft_saved_at!).toLocaleString()}. Save it as a version to keep it in history.</p>}
      {tier !== "pro" && <p className="mt-4 rounded border border-border p-3 text-sm">Your plan is preserved and readable. Editing and new versions are included with Pro. <Link to="/pricing" className="underline">View Pro</Link></p>}

      <fieldset disabled={!editable} className="mt-8 grid gap-5 border-0 p-0">
        <label className="grid gap-2"><span className="eyebrow !mb-0">THE MOVE</span>
          <textarea className="field min-h-24" maxLength={1000} value={c.move} onChange={(e) => set({ move: e.target.value })} /></label>
        <label className="grid gap-2"><span className="eyebrow !mb-0">OPENING LINE</span>
          <input className="field" maxLength={600} value={c.opening} onChange={(e) => set({ opening: e.target.value })} /></label>
        <div className="grid gap-2">
          <span className="eyebrow !mb-0" id="tone-label">SCRIPT TONE</span>
          <div role="radiogroup" aria-labelledby="tone-label" className="flex flex-wrap gap-2">
            {MODES.map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={c.mode === k} className={"filter " + (c.mode === k ? "active" : "")}
                onClick={() => set({ mode: k, script: k !== "custom" && scripts[k] ? scripts[k]! : c.script })}>{l}</button>
            ))}
          </div>
          <label className="sr-only" htmlFor="plan-script">Script</label>
          <textarea id="plan-script" className="field min-h-36" maxLength={4000} value={c.script} onChange={(e) => set({ script: e.target.value, mode: "custom" })} />
          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={async () => { await navigator.clipboard.writeText(c.script); setMsg("Script copied."); }}>COPY SCRIPT</Button>
        </div>
        <label className="grid gap-2"><span className="eyebrow !mb-0">STEPS (ONE PER LINE)</span>
          <textarea className="field min-h-24" value={c.steps.join("\n")} onChange={(e) => set({ steps: e.target.value.split("\n").slice(0, 12) })} /></label>
        <label className="grid gap-2"><span className="eyebrow !mb-0">PRIVATE NOTES</span>
          <textarea className="field min-h-20" maxLength={3000} value={c.notes} onChange={(e) => set({ notes: e.target.value })} /></label>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {editable && <Button type="button" disabled={busy || !dirty} onClick={() => saveVersion({ ...c, steps: c.steps.filter((s) => s.trim()) }, "edit", "Edited")}>{busy ? "SAVING…" : "SAVE AS NEW VERSION"}</Button>}
        <Button type="button" variant="outline" onClick={exportPlan}>EXPORT (.TXT)</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={toggleArchive}>{plan.status === "active" ? "ARCHIVE" : "RESTORE PLAN"}</Button>
        <span className="text-xs" aria-live="polite">{msg || autosave}</span>
      </div>

      {editable && alternatives.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">CHOOSE AN ALTERNATIVE MOVE</h2>
          <ul className="m-0 grid list-none gap-3 p-0">{alternatives.map((a) => (
            <li key={a.option} className="rounded border border-border p-3">
              <p className="m-0 font-semibold">{a.option}</p>
              <p className="m-0 text-sm opacity-90">{a.tradeoff}</p>
              <Button type="button" size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => saveVersion({ ...c, move: a.option }, "alternative", "Chose alternative")}>USE THIS ALTERNATIVE</Button>
            </li>
          ))}</ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="eyebrow">VERSION HISTORY</h2>
        <ol className="m-0 grid list-none gap-2 p-0">{versions.map((v) => (
          <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm">
            <span>v{v.version} · {SOURCE_LABEL[v.source as keyof typeof SOURCE_LABEL] ?? v.source} · {new Date(v.created_at).toLocaleString()}</span>
            {editable && v.version !== plan.current_version && (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => saveVersion(v.content, "restore", `Restored v${v.version}`)}>RESTORE AS NEW VERSION</Button>
            )}
          </li>
        ))}</ol>
        <p className="mt-2 text-xs opacity-80">Versions are never overwritten. The original recommendation is always kept as version 1.</p>
      </section>
    </div>
  );
}
