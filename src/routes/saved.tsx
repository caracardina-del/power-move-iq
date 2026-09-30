import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
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
  const [rows, setRows] = useState<Fav[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    void supabase
      .from("favorite_moves")
      .select("move_id, moves(move_number, title, category, principle)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => (error ? setErr(true) : setRows((data ?? []) as Fav[])));
  }, [userId]);
  async function remove(id: number) {
    const prev = rows;
    setRows((r) => r?.filter((x) => x.move_id !== id) ?? null);
    const { error } = await supabase.from("favorite_moves").delete().eq("user_id", userId).eq("move_id", id);
    if (error) setRows(prev);
  }
  return (
    <section className="mt-14">
      <p className="eyebrow">SAVED MOVES</p>
      {err ? (
        <p className="text-sm text-muted-foreground">Saved moves could not be loaded. Refresh to try again.</p>
      ) : !rows ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">
          No saved moves yet. Use the bookmark on{" "}
          <Link to="/today" className="text-link">
            Today
          </Link>{" "}
          to keep a move here.
        </p>
      ) : (
        <div className="case-list">
          {rows.map((r) => (
            <div className="case-row" key={r.move_id}>
              <span className="case-type">
                MOVE {r.moves?.move_number} · {r.moves?.category}
              </span>
              <div>
                <h3>{r.moves?.title.replace(/\s*·\s*\d+$/, "")}</h3>
                <p>{r.moves?.principle}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r.move_id)}>
                REMOVE
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
