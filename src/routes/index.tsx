import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
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
  const [prompt, setPrompt] = useState("");
  const nav = useNavigate();
  const ready = prompt.trim().length > 0;

  async function begin(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    window.sessionStorage.setItem("pmiq:home-draft", prompt.trim());
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
          <form className="mt-6 grid gap-3" onSubmit={begin}>
            <label className="eyebrow" htmlFor="home-situation">
              WHAT ARE YOU DEALING WITH?
            </label>
            <textarea
              id="home-situation"
              className="field min-h-28 resize-y"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={6000}
              placeholder="Describe the decision, tension, negotiation, or money situation…"
            />
            <Button type="submit" size="lg" disabled={!ready}>
              FIND MY NEXT MOVE <ArrowRight />
            </Button>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {ready
                ? prompt.trim().length >= 40
                  ? "No card required. A free account is needed to run and save your analysis."
                  : `Add more context on the next step (${prompt.trim().length}/40 characters).`
                : "Start with a few words. You can add the details on the next step."}
            </p>
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3" /> No card required. Your situation stays private.
            </p>
          </form>
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
