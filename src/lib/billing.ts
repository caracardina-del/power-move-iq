export const STRIPE_LINKS = {
  monthly: "https://buy.stripe.com/9B6dR8bb71R3f3u9TfeEo01",
  annual: "https://buy.stripe.com/6oU5kC3IFfHTbRi9TfeEo00",
} as const;

/** Adds the signed-in user's id so the verified Stripe webhook can attach the subscription. */
export function checkoutUrl(
  plan: keyof typeof STRIPE_LINKS,
  user: { id: string; email?: string | null },
) {
  const u = new URL(STRIPE_LINKS[plan]);
  u.searchParams.set("client_reference_id", user.id);
  if (user.email) u.searchParams.set("prefilled_email", user.email);
  return u.toString();
}
