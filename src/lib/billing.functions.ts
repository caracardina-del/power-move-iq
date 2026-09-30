import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PortalResult =
  { ok: true; url: string } | { ok: false; reason: "not_configured" | "no_customer" | "stripe_error"; message: string };

/** Creates a Stripe Billing Portal session for the caller's own Stripe customer only. */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalResult> => {
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key)
      return {
        ok: false,
        reason: "not_configured",
        message: "Subscription management isn't switched on yet. Please try again later.",
      };
    const { data } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const customer = data?.stripe_customer_id;
    if (!customer)
      return {
        ok: false,
        reason: "no_customer",
        message: "We couldn't find a subscription billed to this account.",
      };
    const origin = "https://powermoveiq.com";
    const body = new URLSearchParams({ customer, return_url: `${origin}/account` });
    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) {
      console.error("Stripe portal error", res.status, json.error?.message);
      return {
        ok: false,
        reason: "stripe_error",
        message: "The billing page couldn't be opened. Please try again shortly.",
      };
    }
    return { ok: true, url: json.url };
  });
