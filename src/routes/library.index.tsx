import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/power/shell";
import { categories } from "@/lib/power-move-data";

const moves = [
  {
    title: "Name the decision",
    category: "Decision",
    principle: "Write the choice and deadline in one sentence before debating tactics.",
    guidance: "Separate facts from assumptions. Decide what answer you need, from whom, and by when.",
  },
  {
    title: "Price the change",
    category: "Pricing",
    principle: "When scope changes, show the trade between deliverables, fee, and timing.",
    guidance:
      "Offer the original scope at the original fee or a revised option for the added work. Put both paths in writing.",
  },
  {
    title: "Hold the silence",
    category: "Communication",
    principle: "After a clear proposal, allow the other side time to answer.",
    guidance:
      "State the terms once, then set a reasonable follow-up date. Do not negotiate against yourself to fill the pause.",
  },
  {
    title: "Separate urgency from value",
    category: "Negotiation",
    principle: "A short deadline does not make a weak offer stronger.",
    guidance: "Ask what decision actually depends on the date and request the time needed to verify the terms.",
  },
  {
    title: "Trade, never concede",
    category: "Leverage",
    principle: "Attach every meaningful concession to a specific return.",
    guidance:
      "If you reduce price, change scope, timing, commitment, or payment terms in exchange. Make the trade explicit.",
  },
  {
    title: "Ask for the constraint",
    category: "Negotiation",
    principle: "Find out whether the obstacle is budget, authority, timing, or confidence.",
    guidance: "Ask which constraint prevents a yes. Solve that constraint instead of offering a discount by default.",
  },
  {
    title: "Set the next checkpoint",
    category: "Communication",
    principle: "A conversation is unfinished until someone owns the next step and date.",
    guidance: "Recap the decision, named owner, and checkpoint in a short written note after the meeting.",
  },
  {
    title: "Make the alternative real",
    category: "Leverage",
    principle: "Your backup option must be feasible before it becomes negotiating strength.",
    guidance: "Identify the next client, role, supplier, or timing path you could actually take. Never bluff about it.",
  },
  {
    title: "Define the walk-away",
    category: "Boundaries",
    principle: "Set your limit before pressure makes the decision for you.",
    guidance: "Write down the minimum acceptable terms and what you will do if they are not met.",
  },
  {
    title: "Document the agreement",
    category: "Decision",
    principle: "Turn a verbal yes into a shared record of what happens next.",
    guidance: "Confirm scope, fee, timing, responsibilities, and approval in writing before work expands.",
  },
];

export const Route = createFileRoute("/library/")({
  head: () => ({
    meta: [
      { title: "The Move Index — Power Move IQ" },
      {
        name: "description",
        content: "Ten practical strategic moves for negotiation, pricing, leverage, communication, and decisions.",
      },
      { property: "og:title", content: "The Move Index — Power Move IQ" },
      { property: "og:description", content: "Build practical strategic judgment, one move at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Library,
});

function Library() {
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const visible = moves
    .map((move, index) => ({ ...move, number: index + 1 }))
    .filter((move) => cat === "All" || move.category === cat);
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="THE INDEX · FOUNDATIONAL MOVES"
        title="The Move Index"
        intro="Ten practical moves to use now. Open a card for the action behind the principle. More moves are being developed."
      />
      <div className="filter-bar" aria-label="Filter moves by category">
        {categories.map((name) => (
          <button
            type="button"
            className={"filter " + (cat === name ? "active" : "")}
            onClick={() => {
              setCat(name);
              setOpen(null);
            }}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="library-grid">
        {visible.map((move) => (
          <button
            type="button"
            className="move-card text-left w-full cursor-pointer"
            key={move.number}
            aria-expanded={open === move.number}
            onClick={() => setOpen(open === move.number ? null : move.number)}
          >
            <span className="num">{String(move.number).padStart(2, "0")}</span>
            <h3>{move.title}</h3>
            <p>{move.principle}</p>
            {open === move.number && (
              <p className="mt-5 border-t border-current/20 pt-4">
                <strong>PUT IT TO WORK</strong>
                <br />
                {move.guidance}
              </p>
            )}
            <footer>
              <span>{move.category}</span>
              <span>{open === move.number ? "CLOSE −" : "OPEN +"}</span>
            </footer>
          </button>
        ))}
      </div>
    </div>
  );
}
