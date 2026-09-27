import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
import { ProGate, StatePanel } from "@/components/power/ui";
import { useAuthUser } from "@/hooks/use-auth-user";
import { listCases } from "@/lib/moveiq.functions";
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
    body = (
      <StatePanel
        type="error"
        title="Cases could not be loaded"
        body="Please refresh and try again."
      />
    );
  else if (!d)
    body = (
      <StatePanel type="loading" title="Loading cases" body="Retrieving your decision history." />
    );
  else if (d.tier !== "pro")
    body = (
      <>
        <ProGate
          title="Saved cases are included with Pro"
          body={`You have ${d.cases.length} analysis${d.cases.length === 1 ? "" : "es"} on record. Pro keeps a full, searchable decision history.`}
        />
        {d.cases.length > 0 && (
          <div className="case-list mt-8">
            {d.cases.map((c) => (
              <Link
                to="/analysis/$caseId"
                params={{ caseId: c.id }}
                className="case-row"
                key={c.id}
              >
                <span className="case-type">
                  {c.context.type ?? "CASE"} · {new Date(c.created_at).toLocaleDateString()}
                </span>
                <div>
                  <h3>{c.title}</h3>
                </div>
                <span className="status">
                  OPEN <ArrowRight className="inline size-3" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </>
    );
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
    </div>
  );
}
