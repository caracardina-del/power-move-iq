import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Power Move IQ" },
      {
        name: "description",
        content: "Why Power Move IQ exists and how its decision-support works.",
      },
      { property: "og:title", content: "About Power Move IQ" },
      {
        property: "og:description",
        content:
          "Structured decision-support for moments where leverage, language, and timing matter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});
function About() {
  return (
    <div className="page-shell article">
      <p className="eyebrow">ABOUT POWER MOVE IQ</p>
      <h1>Pressure distorts. Structure clarifies.</h1>
      <p className="lead">
        Power Move IQ is decision-support for difficult professional and money situations—the
        moments when leverage, language, timing, and restraint matter.
      </p>
      <h2>What it does</h2>
      <p>
        MOVE IQ™ separates what happened from what you fear happened. It maps leverage and
        constraints, identifies viable moves, provides adaptable language, anticipates countermoves,
        and names the point where walking away becomes strategically reasonable.
      </p>
      <h2>What it is not</h2>
      <p>
        Power Move IQ is educational decision-support. It is not legal, financial, tax, investment,
        employment, or other professional advice. Your context matters; consult a qualified
        professional where appropriate.
      </p>
      <h2>The moment after something changes is when judgment matters most.</h2>
      <p>
        A client goes silent. An offer comes in low. A negotiation stalls. Someone changes the
        terms. Power Move IQ helps you separate facts from assumptions, understand the leverage on
        both sides, and determine what to do—and what to say—next.
      </p>
      <p className="eyebrow mt-8">
        READ THE SITUATION → MAP THE LEVERAGE → CHOOSE THE MOVE → PREPARE THE RESPONSE → RECORD THE
        OUTCOME
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/analyze" search={{ prompt: "" }}>
          ANALYZE MY SITUATION <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
