import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LockKeyhole } from "lucide-react";
import { useEntitlement } from "@/hooks/use-entitlement";
import { checkoutUrl } from "@/lib/billing";
const RETURN_KEY = "pmiq:return-after-auth";
export function GoldRule() {
  return <div className="gold-rule" />;
}
export function StatePanel({
  type = "empty",
  title,
  body,
  children,
}: {
  type?: "empty" | "loading" | "error";
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`state-panel state-${type}`}>
      <span>{type === "loading" ? "···" : type === "error" ? "!" : "—"}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
export function ProLock({ text = "Included with Pro" }: { text?: string }) {
  return (
    <span className="pro-lock">
      <LockKeyhole />
      {text}
    </span>
  );
}
export function ProGate({ title, body }: { title: string; body: string }) {
  return (
    <StatePanel title={title} body={body}>
      <Button asChild>
        <Link to="/pricing">VIEW PRO</Link>
      </Button>
    </StatePanel>
  );
}
function rememberCheckout(plan: "monthly" | "annual") {
  window.sessionStorage.setItem(RETURN_KEY, `checkout:${plan}`);
}
export function PricingCard() {
  const { user, tier, loading } = useEntitlement();
  return (
    <div className="pricing-card">
      <p className="eyebrow">POWER MOVE IQ PRO</p>
      <h3>Decisions compound.</h3>
      <p>Full analyses, Power Maps, scripts, countermoves, saved cases, Outcome Memory, follow-ups, and Weekly IQ.</p>
      <div className="price-row">
        <strong>$14.99</strong>
        <span>/ month</span>
      </div>
      <div className="annual">
        or $99 billed yearly <b>save 45%</b>
      </div>
      {user && tier === "pro" ? (
        <div className="grid gap-2">
          <p className="text-sm">Your Pro membership is active.</p>
          <Button asChild size="lg" className="w-full">
            <Link to="/account">MANAGE SUBSCRIPTION</Link>
          </Button>
        </div>
      ) : user && loading ? (
        <Button size="lg" className="w-full" disabled>
          CHECKING YOUR PLAN…
        </Button>
      ) : user ? (
        <div className="grid gap-2">
          <Button asChild size="lg" className="w-full">
            <a href={checkoutUrl("monthly", user)}>START PRO · $14.99 / MONTH</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <a href={checkoutUrl("annual", user)}>START PRO · $99 / YEAR</a>
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <Button asChild size="lg" className="w-full">
            <Link to="/auth" onClick={() => rememberCheckout("monthly")}>
              START PRO · $14.99 / MONTH
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link to="/auth" onClick={() => rememberCheckout("annual")}>
              START PRO · $99 / YEAR
            </Link>
          </Button>
        </div>
      )}
      <small>
        Secure checkout by Stripe. Renews automatically each month or year until cancelled. Pro activates once Stripe
        confirms payment.
      </small>
    </div>
  );
}
