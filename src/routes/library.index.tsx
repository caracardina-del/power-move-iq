import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/power/shell";
import { StatePanel } from "@/components/power/ui";
import { listMoves } from "@/lib/moves.functions";
import { CATEGORIES, GOALS, SITUATIONS, RISK_LABELS, categoryLabel, TOTAL_MOVES } from "@/content/moves/taxonomy";
import { PRODUCT } from "@/lib/product-facts";

const searchSchema = z.object({
  q: z.string().max(80).catch("").default(""),
  cat: z.string().max(30).catch("").default(""),
  sit: z.string().max(30).catch("").default(""),
  goal: z.string().max(30).catch("").default(""),
  risk: z.string().max(10).catch("").default(""),
  access: z.string().max(10).catch("").default(""),
  sort: z.enum(["number", "alpha"]).catch("number").default("number"),
});

export const Route = createFileRoute("/library/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "The Move Library — Power Move IQ" },
      { name: "description", content: `Strategic Moves for negotiation, pricing, boundaries and difficult conversations, organised into ${PRODUCT.categories} categories.` },
      { property: "og:title", content: "The Move Library — Power Move IQ" },
      { property: "og:description", content: "Search practical strategic Moves by situation, goal and risk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => listMoves(),
  errorComponent: () => <StatePanel type="error" title="The Library could not load." body="Please refresh the page." />,
  notFoundComponent: () => <StatePanel title="Not found" body="This page does not exist." />,
  component: Library,
});

function Library() {
  const { moves, mode, total } = Route.useLoaderData();
  const published = moves.filter((m) => !m.reviewDraft).length;
  const s = Route.useSearch();
  const nav = useNavigate({ from: "/library/" });
  const set = (patch: Partial<typeof s>) => void nav({ search: (p) => ({ ...p, ...patch }), replace: true });
  const filtered = useMemo(() => {
    const q = s.q.trim().toLowerCase();
    const out = moves.filter(
      (m) =>
        (!q || q.split(/\s+/).every((w) => m.searchText.includes(w))) &&
        (!s.cat || m.category === s.cat) &&
        (!s.sit || (m.situations as string[]).includes(s.sit)) &&
        (!s.goal || (m.goals as string[]).includes(s.goal)) &&
        (!s.risk || m.risk === s.risk) &&
        (!s.access || m.access === s.access),
    );
    return out.sort((a, b) => (s.sort === "alpha" ? a.title.localeCompare(b.title) : a.number - b.number));
  }, [moves, s]);
  const active = !!(s.q || s.cat || s.sit || s.goal || s.risk || s.access);
  const sel = "field !py-2 !text-sm";
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={mode === "editorial_preview" ? `EDITORIAL PREVIEW · ${total} MOVES IN REVIEW · ${published} PUBLISHED` : `THE LIBRARY · ${published} OF ${TOTAL_MOVES} MOVES PUBLISHED`}
        title="The Move Library"
        intro={`The Library is organised as ${PRODUCT.structure}.`}
      />
      {mode === "editorial_preview" && (
        <p role="note" className="mb-6 rounded border border-primary p-3 text-sm">
          Review drafts. These Moves are written and checked automatically but have not been approved by a human editor. They are visible only in this unpublished preview and are not shown or recommended on the live site until published.
        </p>
      )}
      {mode === "production" && published === 0 && (
        <StatePanel title="The Library is being prepared." body="Moves appear here once they have passed editorial review." />
      )}
      <form className="mb-6 grid gap-3 md:grid-cols-[2fr_repeat(3,1fr)]" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="sr-only" htmlFor="lib-q">Search Moves</label>
        <input id="lib-q" className={sel} placeholder="Search title, principle, situation…" value={s.q} onChange={(e) => set({ q: e.target.value })} />
        <label className="sr-only" htmlFor="lib-cat">Category</label>
        <select id="lib-cat" className={sel} value={s.cat} onChange={(e) => set({ cat: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="lib-sit">Situation</label>
        <select id="lib-sit" className={sel} value={s.sit} onChange={(e) => set({ sit: e.target.value })}>
          <option value="">All situations</option>
          {SITUATIONS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        <label className="sr-only" htmlFor="lib-goal">Goal</label>
        <select id="lib-goal" className={sel} value={s.goal} onChange={(e) => set({ goal: e.target.value })}>
          <option value="">All goals</option>
          {GOALS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </form>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <select aria-label="Risk level" className={sel} value={s.risk} onChange={(e) => set({ risk: e.target.value })}>
          <option value="">Any risk</option>
          {Object.entries(RISK_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select aria-label="Access" className={sel} value={s.access} onChange={(e) => set({ access: e.target.value })}>
          <option value="">Free and Pro</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
        <select aria-label="Sort" className={sel} value={s.sort} onChange={(e) => set({ sort: e.target.value as "number" | "alpha" })}>
          <option value="number">Sort: Move number</option>
          <option value="alpha">Sort: A–Z</option>
        </select>
        <p className="m-0" aria-live="polite">{filtered.length} {filtered.length === 1 ? "Move" : "Moves"}</p>
        {active && (
          <button type="button" className="underline" onClick={() => nav({ search: { q: "", cat: "", sit: "", goal: "", risk: "", access: "", sort: s.sort }, replace: true })}>
            Clear filters
          </button>
        )}
      </div>
      {moves.length === 0 ? null : filtered.length === 0 ? (
        <StatePanel title="No Moves match." body="Try fewer words, or clear a filter. Not every category is fully authored yet.">
          <button type="button" className="underline" onClick={() => nav({ search: { q: "", cat: "", sit: "", goal: "", risk: "", access: "", sort: "number" } })}>Clear all filters</button>
        </StatePanel>
      ) : (
        <ul className="library-grid list-none p-0">
          {filtered.map((m) => (
            <li key={m.id}>
              <Link to="/library/$slug" params={{ slug: m.slug }} className="move-card block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <span className="num">{String(m.number).padStart(2, "0")}</span>
                <h3>{m.title}</h3>
                <p>{m.summary}</p>
                <footer>
                  <span>{categoryLabel(m.category)}</span>
                  <span>{m.reviewDraft ? "REVIEW DRAFT · " : ""}{m.access === "pro" ? "PRO" : "FREE"}</span>
                </footer>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
