import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

// Verified Stripe events are the ONLY path that grants or removes Pro.
function verify(body: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  return sigs.some((s) => {
    const b = Buffer.from(s);
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}

const ACTIVE = new Set(["active", "trialing"]);

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });
        const body = await request.text();
        if (!verify(body, request.headers.get("stripe-signature"), secret)) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };
        const obj = event.data.object;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const setTier = async (userId: string, pro: boolean) => {
          await supabaseAdmin.from("profiles").upsert({ id: userId, subscription_tier: pro ? "pro" : "free", updated_at: new Date().toISOString() }, { onConflict: "id" });
        };

        if (event.type === "checkout.session.completed") {
          const userId = z.string().uuid().safeParse(obj["client_reference_id"]);
          if (!userId.success || obj["mode"] !== "subscription" || obj["payment_status"] !== "paid") return new Response("ignored");
          const amount = Number(obj["amount_total"] ?? 0);
          await supabaseAdmin.from("subscriptions").upsert({
            user_id: userId.data,
            stripe_customer_id: String(obj["customer"] ?? ""),
            stripe_subscription_id: String(obj["subscription"] ?? ""),
            status: "active",
            plan: amount === 9900 ? "annual" : amount === 1499 ? "monthly" : "unknown",
            updated_at: new Date().toISOString(),
          });
          await setTier(userId.data, true);
        } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
          const { data: sub } = await supabaseAdmin.from("subscriptions").select("user_id").eq("stripe_subscription_id", String(obj["id"])).maybeSingle();
          if (!sub) return new Response("unknown subscription");
          const status = event.type === "customer.subscription.deleted" ? "canceled" : String(obj["status"]);
          const end = Number(obj["current_period_end"] ?? 0);
          await supabaseAdmin.from("subscriptions").update({ status, current_period_end: end ? new Date(end * 1000).toISOString() : null, updated_at: new Date().toISOString() }).eq("user_id", sub.user_id);
          await setTier(sub.user_id, ACTIVE.has(status));
        }
        return new Response("ok");
      },
    },
  },
});
