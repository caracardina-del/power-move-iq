import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwlSlot } from "@/components/power/brand";
import { situations } from "@/lib/power-move-data";
import { readDraft, writeDraft } from "@/lib/guest-store";

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
  const [prompt, setPrompt] = useState("");
  const nav = useNavigate();
  const ready = prompt.trim().length > 0;

  async function begin(e: React.FormEvent) {
    e.preventDefault();
    if (ready) {
      const prev = readDraft();
      writeDraft({ situation: prompt.trim(), type: prev?.type ?? "Other", urgency: prev?.urgency ?? "Exploring options" });
    }
    await nav({ to: "/analyze", search: { prompt: "" } });
  }

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
            When the stakes change, don’t guess. Map the situation, understand your leverage, and choose your next move.
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
      <section className="border-t border-border px-[7vw] py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-center md:gap-14">
          <div>
            <p className="eyebrow">YOUR SITUATION</p>
            <h2 className="serif m-0 text-4xl leading-none md:text-5xl">Start with what happened.</h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Write in your own words. Your draft carries into the strategic read and stays private.
            </p>
          </div>
          <form className="grid gap-3" onSubmit={begin}>
            <label className="eyebrow !mb-0" htmlFor="home-situation">
              WHAT ARE YOU DEALING WITH?
            </label>
            <textarea
              id="home-situation"
              className="field min-h-24 resize-y"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={6000}
              placeholder="Describe the decision, tension, negotiation, or money situation…"
            />
            <Button type="submit" size="lg">
              ANALYZE MY SITUATION <ArrowRight />
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3" /> No card required. A free account is needed to run and save your
              analysis.
            </p>
          </form>
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
