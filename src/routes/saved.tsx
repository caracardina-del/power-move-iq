import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
import { useServerFn } from "@tanstack/react-start";
import { listPlans } from "@/lib/plans.functions";
import { listSavedMoves, setMoveSaved } from "@/lib/moves.functions";
import { StatePanel } from "@/components/power/ui";
import { useAuthUser } from "@/hooks/use-auth-user";
import { listCases } from "@/lib/moveiq.functions";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved Cases — Power Move IQ" },
      { name: "description", content: "Your saved analyses and Outcome Memory history." },
      { property: "og:title", content: "Saved Cases — Power Move IQ" },
      {
        property: "og:description",
        content: "Return to recommendations, chosen moves, and recorded outcomes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Saved,
});
type D = Awaited<ReturnType<typeof listCases>>;
function Saved() {
  const { user, ready } = useAuthUser();
  const fn = useServerFn(listCases);
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (user)
      fn()
        .then(setD)
        .catch(() => setErr(true));
  }, [user, fn]);
  let body: React.ReactNode;
  if (ready && !user)
    body = (
      <StatePanel title="Sign in to see your cases" body="Saved cases are private to your account.">
        <Button asChild>
          <Link to="/auth">SIGN IN</Link>
        </Button>
      </StatePanel>
    );
  else if (err)
    body = <StatePanel type="error" title="Cases could not be loaded" body="Please refresh and try again." />;
  else if (!d) body = <StatePanel type="loading" title="Loading cases" body="Retrieving your decision history." />;
  else if (!d.cases.length)
    body = (
      <StatePanel title="No cases yet" body="Run your first analysis and it will appear here.">
        <Button asChild>
          <Link to="/analyze" search={{ prompt: "" }}>
            ANALYZE A SITUATION
          </Link>
        </Button>
      </StatePanel>
    );
  else
    body = (
      <div className="case-list">
        {d.cases.map((c) => {
          const o = (c.outcomes as { outcome: string }[] | null)?.[0]?.outcome;
          return (
            <Link to="/analysis/$caseId" params={{ caseId: c.id }} className="case-row" key={c.id}>
              <span className="case-type">
                {c.context.type ?? "CASE"} · {new Date(c.created_at).toLocaleDateString()}
              </span>
              <div>
                <h3>{c.title}</h3>
                <p>{c.situation.slice(0, 180)}</p>
              </div>
              <span className="status">
                {o ? o : "Open"} <ArrowRight className="inline size-3" />
              </span>
            </Link>
          );
        })}
      </div>
    );
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="YOUR DECISION HISTORY"
        title="Saved Cases"
        intro="Return to the read, revisit your chosen move, and record what happened next."
        action={
          <Link to="/outcomes" className="header-cta">
            OUTCOME MEMORY
          </Link>
        }
      />
      {body}
      {user && <SavedMoves userId={user.id} />}
    </div>
  );
}

type Fav = {
  move_id: number;
  moves: { move_number: number; title: string; category: string; principle: string } | null;
};
function SavedMoves({ userId }: { userId: string }) {
  return (
    <>
      <PlansSection />
      <CanonicalSaved />
      <LegacyFavorites userId={userId} />
    </>
  );
}

function PlansSection() {
  const fetchPlans = useServerFn(listPlans);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listPlans>> | null>(null);
  const [err, setErr] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  useEffect(() => { fetchPlans().then(setRows).catch(() => setErr(true)); }, [fetchPlans]);
  const list = (rows ?? []).filter((r) => (showArchived ? r.status === "archived" : r.status === "active"));
  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">MOVE PLANS</p>
        <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>{showArchived ? "SHOW ACTIVE" : "SHOW ARCHIVED"}</Button>
      </div>
      {err ? <p className="text-sm text-muted-foreground">Plans could not be loaded. Refresh to try again.</p>
        : !rows ? <p className="text-sm text-muted-foreground">Loading…</p>
        : !list.length ? <p className="text-sm text-muted-foreground">{showArchived ? "No archived plans." : "No plans yet. Open a full analysis and choose Edit as Move Plan."}</p>
        : <div className="case-list">{list.map((r) => (
            <Link to="/plans/$planId" params={{ planId: r.id }} className="case-row" key={r.id}>
              <span className="case-type">PLAN · V{r.current_version}{r.draft_saved_at ? " · UNSAVED DRAFT" : ""}</span>
              <div><h3>{r.title}</h3><p>Updated {new Date(r.updated_at).toLocaleDateString()}</p></div>
              <span aria-hidden>→</span>
            </Link>))}</div>}
    </section>
  );
}

function CanonicalSaved() {
  const fetchSaved = useServerFn(listSavedMoves);
  const toggle = useServerFn(setMoveSaved);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listSavedMoves>> | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetchSaved().then(setRows).catch(() => setErr(true)); }, [fetchSaved]);
  async function remove(ref: string) {
    const prev = rows;
    setRows((r) => r?.filter((x) => x.move_ref !== ref) ?? null);
    const r = await toggle({ data: { moveRef: ref, saved: false } }).catch(() => ({ ok: false }));
    if (!r.ok) setRows(prev);
  }
  return (
    <section className="mt-14">
      <p className="eyebrow">SAVED MOVES</p>
      {err ? <p className="text-sm text-muted-foreground">Saved Moves could not be loaded. Refresh to try again.</p>
        : !rows ? <p className="text-sm text-muted-foreground">Loading…</p>
        : !rows.length ? <p className="text-sm text-muted-foreground">No saved Moves yet. Use the bookmark on <Link to="/today" className="text-link">Today</Link> or in the <Link to="/library" className="text-link">Library</Link>.</p>
        : <div className="case-list">{rows.map((r) => (
            <div className="case-row" key={r.move_ref}>
              <span className="case-type">{r.move ? `MOVE ${r.move.number} · ${r.move.category}${r.move.reviewDraft ? " · REVIEW DRAFT" : ""}` : "UNAVAILABLE"}</span>
              <div>
                {r.move ? <Link to="/library/$slug" params={{ slug: r.move.slug }}><h3>{r.move.title}</h3></Link> : <h3>This Move is not currently published</h3>}
                <p>{r.move?.principle ?? "Your save is kept and will reappear if it is published."}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r.move_ref)}>REMOVE</Button>
            </div>))}</div>}
    </section>
  );
}

/** Pre-catalog favorites reference old numeric rows; they are shown as-is and never mapped to new Move IDs. */
function LegacyFavorites({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Fav[] | null>(null);
  useEffect(() => {
    void supabase.from("favorite_moves").select("move_id, moves(move_number, title, category, principle)")
      .eq("user_id", userId).order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Fav[]));
  }, [userId]);
  if (!rows?.length) return null;
  return (
    <section className="mt-14">
      <p className="eyebrow">EARLIER SAVES · LEGACY EDITION</p>
      <p className="text-xs text-muted-foreground">Saved before the Move Library was rebuilt. Kept unchanged for your records.</p>
      <div className="case-list">{rows.map((r) => (
        <div className="case-row" key={r.move_id}>
          <span className="case-type">LEGACY DAILY MOVE {r.moves?.move_number}</span>
          <div><h3>{r.moves?.title.replace(/\s*·\s*\d+$/, "")}</h3><p>{r.moves?.principle}</p></div>
        </div>))}</div>
    </section>
  );
}
