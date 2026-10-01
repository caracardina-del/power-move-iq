import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatePanel, ProLock } from "@/components/power/ui";
import { getMove, getMoveFull } from "@/lib/moves.functions";
import { categoryLabel, labelOf, SITUATIONS, GOALS, RISK_LABELS } from "@/content/moves/taxonomy";
import { useAuthUser } from "@/hooks/use-auth-user";

export const Route = createFileRoute("/library/$slug")({
  loader: async ({ params }) => {
    const move = await getMove({ data: { slug: params.slug } });
    if (!move) throw notFound();
    return move;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Move not found — Power Move IQ" }, { name: "robots", content: "noindex" }] };
    const t = `Move ${loaderData.number}: ${loaderData.title} — Power Move IQ`;
    return {
      meta: [
        { title: t },
        { name: "description", content: loaderData.summary },
        { property: "og:title", content: t },
        { property: "og:description", content: loaderData.summary },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => <StatePanel type="error" title="This Move could not load." body="Please refresh, or return to the Library." />,
  notFoundComponent: () => (
    <div className="page-shell">
      <StatePanel title="Move not found." body="This Move does not exist or has not been published yet.">
        <Button asChild><Link to="/library" search={{}}>BACK TO THE LIBRARY</Link></Button>
      </StatePanel>
    </div>
  ),
  component: MovePage,
});

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-8">
      <h2 className="eyebrow">{title}</h2>
      <ul className="m-0 grid gap-2 pl-5 leading-relaxed">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </section>
  );
}

const MODES = [["default", "Default"], ["diplomatic", "Diplomatic"], ["direct", "Direct"], ["firm", "Firm"], ["written", "Email"], ["message", "Message"]] as const;

function MovePage() {
  const m = Route.useLoaderData();
  const { user, ready } = useAuthUser();
  const fetchFull = useServerFn(getMoveFull);
  const pro = useQuery({
    queryKey: ["move-full", m.slug, user?.id],
    queryFn: () => fetchFull({ data: { slug: m.slug } }),
    enabled: m.locked && !!user,
  });
  const full = m.full ?? (pro.data?.ok ? pro.data.full : null);
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("default");
  const [note, setNote] = useState("");
  const script = full ? full.scripts[mode] : undefined;

  async function share() {
    const url = `${window.location.origin}/library/${m.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: m.title, url });
      else { await navigator.clipboard.writeText(url); setNote("Link copied."); }
    } catch { /* user cancelled */ }
  }

  return (
    <article className="page-shell max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link to="/library" search={{}} className="underline">Library</Link> <span aria-hidden>›</span> {categoryLabel(m.category)}
      </nav>
      <p className="eyebrow">MOVE {String(m.number).padStart(2, "0")} · {categoryLabel(m.category).toUpperCase()} · {m.access === "pro" ? "PRO" : "FREE"}</p>
      <h1 className="serif m-0 text-4xl leading-tight md:text-5xl">{m.title}</h1>
      <p className="mt-4 text-lg leading-relaxed">{m.summary}</p>
      <blockquote className="exit-quote mt-6">{m.principle}</blockquote>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="situation-chip">{RISK_LABELS[m.risk]}</span>
        {m.situations.map((s) => <span key={s} className="situation-chip">{labelOf(SITUATIONS, s)}</span>)}
        {m.goals.map((g) => <span key={g} className="situation-chip">{labelOf(GOALS, g)}</span>)}
      </div>
      <section className="mt-8"><h2 className="eyebrow">WHY IT WORKS</h2><p className="leading-relaxed">{m.whyItWorks}</p></section>
      <List title="WHEN TO USE IT" items={m.whenToUse} />
      <List title="WHEN NOT TO USE IT" items={m.whenNotToUse} />
      <List title="SIGNALS IT FITS" items={m.signals} />

      {full ? (
        <>
          <List title="PREPARATION" items={full.preparation} />
          <section className="mt-8">
            <h2 className="eyebrow">STEP BY STEP</h2>
            <ol className="m-0 grid gap-2 pl-5 leading-relaxed">{full.steps.map((st) => <li key={st}>{st}</li>)}</ol>
          </section>
          <section className="mt-8">
            <h2 className="eyebrow">OPENING LINE</h2>
            <p className="serif text-2xl leading-snug">“{full.openingLine}”</p>
          </section>
          <section className="mt-8">
            <h2 className="eyebrow">SCRIPT</h2>
            <div role="tablist" aria-label="Script tone" className="mb-3 flex flex-wrap gap-2">
              {MODES.filter(([k]) => full.scripts[k]).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={mode === k} type="button" className={"filter " + (mode === k ? "active" : "")} onClick={() => setMode(k)}>{l}</button>
              ))}
            </div>
            <p className="whitespace-pre-line rounded border border-border p-4 leading-relaxed">{script}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={async () => { if (script) { await navigator.clipboard.writeText(script); setNote("Script copied."); } }}>COPY SCRIPT</Button>
          </section>
          <section className="mt-8">
            <h2 className="eyebrow">LIKELY RESPONSES & COUNTERS</h2>
            <dl className="m-0 grid gap-3">{full.reactions.map((r) => (
              <div key={r.ifThey}><dt className="font-semibold">If they {r.ifThey}</dt><dd className="m-0 opacity-90">{r.counter}</dd></div>
            ))}</dl>
          </section>
          <section className="mt-8"><h2 className="eyebrow">SECOND MOVE</h2><p>{full.secondMove}</p></section>
          <section className="mt-8"><h2 className="eyebrow">FOLLOW-UP</h2><p>{full.followUp}</p></section>
          <List title="COMMON MISTAKES" items={full.mistakes} />
          <List title="WALK-AWAY CONDITIONS" items={full.walkAway} />
          <section className="mt-8"><h2 className="eyebrow">EXAMPLE (FICTIONAL)</h2><p className="leading-relaxed">{full.example}</p></section>
        </>
      ) : (
        <div className="mt-10">
          <StatePanel
            type={pro.isLoading ? "loading" : "empty"}
            title={pro.isLoading ? "Checking your plan…" : "Execution guidance is included with Pro."}
            body={!ready || pro.isLoading ? "One moment." : user ? "Preparation, steps, scripts in five tones, countermoves and the Second Move are part of Pro." : "Sign in with a Pro account to see preparation, steps, scripts and countermoves."}
          >
            {ready && !pro.isLoading && (user ? <Button asChild><Link to="/pricing">VIEW PRO</Link></Button> : <Button asChild><Link to="/auth">SIGN IN</Link></Button>)}
            <ProLock />
          </StatePanel>
        </div>
      )}

      <section className="mt-8 rounded border border-border p-4">
        <h2 className="eyebrow">ETHICAL BOUNDARY</h2>
        <p className="m-0">{m.ethicalBoundary}</p>
      </section>

      {m.relatedMoves.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow">RELATED MOVES</h2>
          <ul className="m-0 grid gap-2 pl-0 list-none">{m.relatedMoves.map((r) => (
            <li key={r.id}><Link to="/library/$slug" params={{ slug: r.slug }} className="underline">Move {r.number}: {r.title}</Link></li>
          ))}</ul>
        </section>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button asChild><Link to="/analyze" search={{ prompt: "" }}>ANALYZE MY SITUATION</Link></Button>
        <Button type="button" variant="outline" onClick={share}>SHARE MOVE</Button>
        <p className="m-0 text-sm" aria-live="polite">{note}</p>
      </div>
      <p className="mt-8 text-xs opacity-80">
        Content version {m.editorial.version} · {m.editorial.lastReviewed ? `Last reviewed ${m.editorial.lastReviewed}` : "Awaiting editorial review"} · Educational decision support, not legal, financial or employment advice.
      </p>
    </article>
  );
}
