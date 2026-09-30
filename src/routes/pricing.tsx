import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
import { PricingCard } from "@/components/power/ui";
export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Power Move IQ" },
      { name: "description", content: "Choose free daily intelligence or unlock the complete Power Move IQ system." },
      { property: "og:title", content: "Power Move IQ Pricing" },
      { property: "og:description", content: "Pro is $14.99 monthly or $99 yearly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});
function Pricing() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="MEMBERSHIP"
        title="Better moves. Better memory."
        intro="Try a real analysis before creating an account. Go Pro when you need the complete read, exact language, follow-up analysis, and a record of what works."
      />
      <div className="pricing-grid">
        <div className="free-card">
          <p className="eyebrow">FREE</p>
          <h2 className="text-4xl">Build the habit.</h2>
          <ul className="features">
            <li>Daily Move</li>
            <li>Ten foundational moves in the Library</li>
            <li>One real guest analysis before signup; free accounts include limited monthly analyses</li>
            <li>Basic streak tracking</li>
          </ul>
          <Button asChild variant="outline">
            <Link to="/analyze">ANALYZE MY SITUATION</Link>
          </Button>
        </div>
        <PricingCard />
      </div>
      <div className="mt-8 grid gap-3 text-xs leading-6 text-muted-foreground">
        <p>
          Pro is billed at $14.99 per month or $99 per year through Stripe and renews automatically at the same interval
          until you cancel. Cancelling stops future renewals; Pro access continues until the end of the period already
          paid for.
        </p>
        <p>
          Pro is activated only after Stripe confirms your payment, usually within a minute. Taxes may apply depending
          on your location.
        </p>
      </div>
    </div>
  );
}
