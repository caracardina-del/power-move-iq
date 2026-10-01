import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { anyGrantsPro } from "@/lib/billing-policy";

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


const eventSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  created: z.number(),
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

const str = (v: unknown) => (typeof v === "string" ? v : "");

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
        const logEvent = async () => {
          const { error } = await supabaseAdmin
            .from("stripe_events")
            .insert({ id: event.id, type: event.type });
          if (error && error.code !== "23505") console.error("stripe-webhook: event log failed", error);
        };

        // Tier is derived from ALL of a user's subscriptions: one ending never revokes another.
        const recomputeTier = async (userId: string) => {
          const { data, error } = await supabaseAdmin
            .from("stripe_subscriptions")
            .select("status, current_period_end")
            .eq("user_id", userId);
          if (error) return error;
          // Bounded policy: see src/lib/billing-policy.ts (past_due only within the grace window).
          const pro = anyGrantsPro(data ?? []);
          const { error: tErr } = await supabaseAdmin
            .from("profiles")
            .update({ subscription_tier: pro ? "pro" : "free", updated_at: new Date().toISOString() })
            .eq("id", userId);
          return tErr;
        };

        // Upsert one subscription row, ignoring stale (older) events for that subscription.
        const writeSub = async (row: {
          subId: string;
          userId: string;
          customer?: string;
          status: string;
          plan?: string | null;
          end?: string | null;
          cancelAtEnd?: boolean;
        }) => {
          const { data: cur, error: cErr } = await supabaseAdmin
            .from("stripe_subscriptions")
            .select("last_event_at, user_id")
            .eq("stripe_subscription_id", row.subId)
            .maybeSingle();
          if (cErr) return { error: cErr };
          if (cur && cur.user_id !== row.userId) {
            console.warn("stripe-webhook: subscription user mismatch", row.subId);
            return { stale: true };
          }
          if (cur?.last_event_at && new Date(cur.last_event_at) > new Date(eventAt))
            return { stale: true };
          const { error } = await supabaseAdmin.from("stripe_subscriptions").upsert({
            stripe_subscription_id: row.subId,
            user_id: row.userId,
            ...(row.customer ? { stripe_customer_id: row.customer } : {}),
            status: row.status,
            ...(row.plan ? { plan: row.plan } : {}),
            ...(row.end !== undefined ? { current_period_end: row.end } : {}),
            ...(row.cancelAtEnd !== undefined ? { cancel_at_period_end: row.cancelAtEnd } : {}),
            last_event_at: eventAt,
            updated_at: new Date().toISOString(),
          });
          if (error) return { error };
          // Legacy one-row-per-user table keeps the customer id used by the billing portal.
          if (row.customer) {
            await supabaseAdmin.from("subscriptions").upsert({
              user_id: row.userId,
              stripe_customer_id: row.customer,
              stripe_subscription_id: row.subId,
              status: row.status,
              ...(row.plan ? { plan: row.plan } : {}),
              last_event_at: eventAt,
              updated_at: new Date().toISOString(),
            });
          }
          return {};
        };

        const ensureProfile = async (userId: string) => {
          const { data: profile, error } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .maybeSingle();
          if (error) return { error };
          if (profile) return { ok: true };
          const { data: au } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (!au?.user) return { ok: false };
          const { error: iErr } = await supabaseAdmin
            .from("profiles")
            .upsert({ id: au.user.id, email: au.user.email ?? "" }, { onConflict: "id" });
          return iErr ? { error: iErr } : { ok: true };
        };

        if (event.type.startsWith("checkout.session.")) {
          const known = [
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
            "checkout.session.async_payment_failed",
          ];
          if (!known.includes(event.type)) {
            await logEvent();
            return new Response("ignored");
          }
          const userId = z.string().uuid().safeParse(obj["client_reference_id"]);
          const subId = str(obj["subscription"]);
          const customer = str(obj["customer"]);
          if (!userId.success || obj["mode"] !== "subscription" || !subId) {
            await logEvent();
            return new Response("ignored");
          }
          const p = await ensureProfile(userId.data);
          if (p.error) return retry("profile lookup failed", p.error);
          if (!p.ok) {
            console.warn("stripe-webhook: checkout for unknown user", userId.data);
            await logEvent();
            return new Response("unknown user");
          }
          const payStatus = str(obj["payment_status"]);
          const paid = payStatus === "paid" || payStatus === "no_payment_required";
          let status: string;
          if (event.type === "checkout.session.async_payment_failed") status = "incomplete_expired";
          else if (event.type === "checkout.session.async_payment_succeeded") status = paid ? "active" : "incomplete";
          else status = paid ? "active" : "incomplete"; // delayed methods: link now, grant later
          const amount = Number(obj["amount_subtotal"] ?? obj["amount_total"] ?? 0);
          const plan = amount === 9900 ? "annual" : amount === 1499 ? "monthly" : null;
          const w = await writeSub({ subId, userId: userId.data, customer, status, plan });
          if (w.error) return retry("subscription write failed", w.error);
          const tErr = await recomputeTier(userId.data);
          if (tErr) return retry("tier update failed", tErr);
        } else if (
          event.type === "customer.subscription.created" ||
          event.type === "customer.subscription.updated" ||
          event.type === "customer.subscription.deleted"
        ) {
          const subId = str(obj["id"]);
          const customer = str(obj["customer"]);
          let userId: string | null = null;
          const { data: sub, error: sErr } = await supabaseAdmin
            .from("stripe_subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();
          if (sErr) return retry("subscription lookup failed", sErr);
          userId = sub?.user_id ?? null;
          if (!userId && customer) {
            const { data: byCust } = await supabaseAdmin
              .from("stripe_subscriptions")
              .select("user_id")
              .eq("stripe_customer_id", customer)
              .limit(1)
              .maybeSingle();
            userId = byCust?.user_id ?? null;
          }
          // Arrived before checkout linked it to a user: ask Stripe to retry later.
          if (!userId) return new Response("subscription not yet linked", { status: 409 });
          const status =
            event.type === "customer.subscription.deleted" ? "canceled" : str(obj["status"]);
          const end = Number(
            obj["current_period_end"] ??
              (obj["items"] as { data?: { current_period_end?: number }[] })?.data?.[0]
                ?.current_period_end ??
              0,
          );
          const w = await writeSub({
            subId,
            userId,
            customer,
            status,
            plan: planFromSub(obj),
            end: end ? new Date(end * 1000).toISOString() : null,
            cancelAtEnd: Boolean(obj["cancel_at_period_end"]),
          });
          if (w.error) return retry("subscription update failed", w.error);
          const tErr = await recomputeTier(userId);
          if (tErr) return retry("tier update failed", tErr);
        }

        await logEvent();
        return new Response("ok");
      },
    },
  },
});
