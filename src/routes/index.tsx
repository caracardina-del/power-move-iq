import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwlSlot } from "@/components/power/brand";
import { situations } from "@/lib/power-move-data";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Power Move IQ — Know Your Next Move" },
      {
        name: "description",
        content: "Decision intelligence for difficult professional and money situations.",
      },
      { property: "og:title", content: "Power Move IQ — Know Your Next Move" },
      {
        property: "og:description",
        content: "Map the situation, understand your leverage, and choose your next move.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});
function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">DECISION INTELLIGENCE</p>
          <h1>
            POWER
            <br />
            MOVE IQ<span>KNOW YOUR NEXT MOVE.</span>
          </h1>
          <p className="hero-lede">
            When the stakes change, don’t guess. Map the situation, understand your leverage, and
            choose your next move.
          </p>
          <Button asChild size="lg">
            <Link to="/analyze" search={{ prompt: "" }}>
              ANALYZE MY SITUATION <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="hero-medallion">
          <OwlSlot />
        </div>
      </section>
      <section className="chips-band">
        <div className="chips-inner">
          {situations.map((s) => (
            <Link key={s} to="/analyze" search={{ prompt: s }} className="situation-chip">
              {s}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
