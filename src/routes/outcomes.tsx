import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
import { ProGate, StatePanel } from "@/components/power/ui";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getOutcomeMemory } from "@/lib/moveiq.functions";
export const Route = createFileRoute("/outcomes")({
  head: () => ({
    meta: [
      { title: "Outcome Memory — Power Move IQ" },
      {
        name: "description",
        content: "See how your decisions resolved and sharpen future judgment.",
      },
      { property: "og:title", content: "Outcome Memory — Power Move IQ" },
      {
        property: "og:description",
        content: "Your recommendations, chosen moves, and real-world results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Outcomes,
});
type D = Awaited<ReturnType<typeof getOutcomeMemory>>;
function Outcomes() {
  const { user, ready } = useAuthUser();
  const fn = useServerFn(getOutcomeMemory);
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
      <StatePanel
        title="Sign in to see Outcome Memory"
        body="Recorded outcomes are private to your account."
      >
        <Button asChild>
          <Link to="/auth">SIGN IN</Link>
        </Button>
      </StatePanel>
    );
  else if (err)
    body = (
      <StatePanel
        type="error"
        title="Outcomes could not be loaded"
        body="Please refresh and try again."
      />
    );
  else if (!d)
    body = <StatePanel type="loading" title="Loading outcomes" body="Retrieving your results." />;
  else if (d.tier !== "pro" || !d.metrics)
    body = (
      <ProGate
        title="Outcome Memory is included with Pro"
        body="Record what you chose and what happened, and see your patterns over time."
      />
    );
  else if (!d.rows.length)
    body = (
      <StatePanel
        title="No outcomes recorded yet"
        body="Open a saved case and record what happened to start building your memory."
      >
        <Button asChild>
          <Link to="/saved">SAVED CASES</Link>
        </Button>
      </StatePanel>
    );
  else
    body = (
      <>
        <div className="metric-row mb-10">
          <div>
            <strong>{d.metrics.total}</strong>
            <span>Recorded outcomes</span>
          </div>
          <div>
            <strong>{d.metrics.favorableRate ?? 0}%</strong>
            <span>Accepted or negotiated</span>
          </div>
          <div>
            <strong>
              {d.metrics.avgDays ?? "—"}
              {d.metrics.avgDays !== null ? " d" : ""}
            </strong>
            <span>Average days to outcome</span>
          </div>
        </div>
        <div className="case-list">
          {d.rows.map((r) => {
            const a = r.analyses as { id: string; title: string } | null;
            return (
              <div className="case-row" key={r.id}>
                <span className="case-type">{new Date(r.recorded_at).toLocaleDateString()}</span>
                <div>
                  <h3>
                    {a ? (
                      <Link to="/analysis/$caseId" params={{ caseId: a.id }}>
                        {a.title}
                      </Link>
                    ) : (
                      "Case"
                    )}
                  </h3>
                  <p>
                    Chosen move: {r.chosen_move ?? "—"}
                    {r.result_note ? ` · ${r.result_note}` : ""}
                  </p>
                </div>
                <span className="status">{r.outcome}</span>
              </div>
            );
          })}
        </div>
      </>
    );
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="OUTCOME MEMORY™"
        title="What happened matters."
        intro="The recommendation is only half the intelligence. Track what you chose, what they did, and what the result taught you."
      />
      {body}
    </div>
  );
}
