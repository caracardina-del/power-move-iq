import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

// Verified Stripe events are the ONLY path that grants or removes Pro.
function verify(body: string, header: string | null, secret: string) {
  if (!header) return false;
  const items = header.split(",").map((p) => p.trim());
  const t = items.find((p) => p.startsWith("t="))?.slice(2);
  const sigs = items.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !/^\d+$/.test(t) || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  return sigs.some((s) => {
    const b = Buffer.from(s);
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}

// past_due keeps access during Stripe's retry window; canceled/unpaid/incomplete remove it.
const ENTITLED = new Set(["active", "trialing", "past_due"]);

const eventSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  created: z.number(),
  livemode: z.boolean().optional(),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

const retry = (msg: string, err?: unknown) => {
  console.error("stripe-webhook:", msg, err);
  return new Response(msg, { status: 500 }); // non-2xx → Stripe retries
};

function planFromSub(obj: Record<string, unknown>): string | null {
  const items = (obj["items"] as { data?: { price?: { recurring?: { interval?: string } } }[] })
    ?.data;
  const interval = items?.[0]?.price?.recurring?.interval;
  return interval === "year" ? "annual" : interval === "month" ? "monthly" : null;
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });
        const body = await request.text();
        if (!verify(body, request.headers.get("stripe-signature"), secret))
          return new Response("Invalid signature", { status: 401 });

        let parsed;
        try {
          parsed = eventSchema.safeParse(JSON.parse(body));
        } catch {
          return new Response("Bad payload", { status: 400 });
        }
        if (!parsed.success) return new Response("Bad payload", { status: 400 });
        const event = parsed.data;
        const obj = event.data.object;
        const eventAt = new Date(event.created * 1000).toISOString();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: skip events already fully processed.
        const { data: seen, error: seenErr } = await supabaseAdmin
          .from("stripe_events")
          .select("id")
          .eq("id", event.id)
          .maybeSingle();
        if (seenErr) return retry("event lookup failed", seenErr);
        if (seen) return new Response("duplicate");

        const setTier = async (userId: string, pro: boolean) => {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ subscription_tier: pro ? "pro" : "free", updated_at: new Date().toISOString() })
            .eq("id", userId);
          return error;
        };

        if (event.type === "checkout.session.completed") {
          const userId = z.string().uuid().safeParse(obj["client_reference_id"]);
          const paid = obj["payment_status"] === "paid" || obj["payment_status"] === "no_payment_required";
          const subId = typeof obj["subscription"] === "string" ? obj["subscription"] : "";
          const customer = typeof obj["customer"] === "string" ? obj["customer"] : "";
          if (!userId.success || obj["mode"] !== "subscription" || !paid || !subId) {
            await supabaseAdmin.from("stripe_events").insert({ id: event.id, type: event.type });
            return new Response("ignored");
          }
          // The referenced user must exist; the checkout email should match their account.
          const { data: profile, error: pErr } = await supabaseAdmin
            .from("profiles")
            .select("id, email")
            .eq("id", userId.data)
            .maybeSingle();
          if (pErr) return retry("profile lookup failed", pErr);
          if (!profile) {
            const { data: au } = await supabaseAdmin.auth.admin.getUserById(userId.data);
            if (!au?.user) {
              console.warn("stripe-webhook: checkout for unknown user", userId.data);
              await supabaseAdmin.from("stripe_events").insert({ id: event.id, type: event.type });
              return new Response("unknown user");
            }
            const { error: cErr } = await supabaseAdmin
              .from("profiles")
              .upsert({ id: au.user.id, email: au.user.email ?? "" }, { onConflict: "id" });
            if (cErr) return retry("profile create failed", cErr);
          }
          const details = obj["customer_details"] as { email?: string } | undefined;
          if (details?.email && profile?.email && details.email.toLowerCase() !== profile.email.toLowerCase())
            console.warn("stripe-webhook: checkout email differs from account email", event.id);

          const { data: existing } = await supabaseAdmin
            .from("subscriptions")
            .select("last_event_at, stripe_subscription_id")
            .eq("user_id", userId.data)
            .maybeSingle();
          // Don't let an old checkout overwrite a newer subscription event.
          if (!(existing?.last_event_at && existing.stripe_subscription_id === subId && existing.last_event_at > eventAt)) {
            const amount = Number(obj["amount_subtotal"] ?? obj["amount_total"] ?? 0);
            const { error } = await supabaseAdmin.from("subscriptions").upsert({
              user_id: userId.data,
              stripe_customer_id: customer,
              stripe_subscription_id: subId,
              status: "active",
              plan: amount === 9900 ? "annual" : amount === 1499 ? "monthly" : "unknown",
              last_event_at: eventAt,
              updated_at: new Date().toISOString(),
            });
            if (error) return retry("subscription upsert failed", error);
            const tErr = await setTier(userId.data, true);
            if (tErr) return retry("tier update failed", tErr);
          }
        } else if (
          event.type === "customer.subscription.created" ||
          event.type === "customer.subscription.updated" ||
          event.type === "customer.subscription.deleted"
        ) {
          const subId = String(obj["id"] ?? "");
          const { data: sub, error: sErr } = await supabaseAdmin
            .from("subscriptions")
            .select("user_id, last_event_at")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();
          if (sErr) return retry("subscription lookup failed", sErr);
          // Arrived before checkout.session.completed: ask Stripe to retry later.
          if (!sub) return new Response("subscription not yet linked", { status: 409 });
          if (sub.last_event_at && sub.last_event_at > eventAt) {
            await supabaseAdmin.from("stripe_events").insert({ id: event.id, type: event.type });
            return new Response("stale");
          }
          const status =
            event.type === "customer.subscription.deleted" ? "canceled" : String(obj["status"]);
          const end = Number(
            obj["current_period_end"] ??
              (obj["items"] as { data?: { current_period_end?: number }[] })?.data?.[0]
                ?.current_period_end ??
              0,
          );
          const plan = planFromSub(obj);
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status,
              ...(plan ? { plan } : {}),
              cancel_at_period_end: Boolean(obj["cancel_at_period_end"]),
              current_period_end: end ? new Date(end * 1000).toISOString() : null,
              last_event_at: eventAt,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subId);
          if (error) return retry("subscription update failed", error);
          // cancel_at_period_end keeps status "active" → Pro stays until the period ends.
          const tErr = await setTier(sub.user_id, ENTITLED.has(status));
          if (tErr) return retry("tier update failed", tErr);
        }

        const { error: logErr } = await supabaseAdmin
          .from("stripe_events")
          .insert({ id: event.id, type: event.type });
        if (logErr && logErr.code !== "23505") console.error("stripe-webhook: event log failed", logErr);
        return new Response("ok");
      },
    },
  },
});
