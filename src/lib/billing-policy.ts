/**
 * Server-side billing entitlement policy (shared by getTier and the Stripe webhook).
 * - active / trialing: Pro until the paid period ends (plus a 1-day clock-skew allowance).
 * - past_due: Pro only for a bounded grace window after the period end, while Stripe retries payment.
 * - anything else (canceled, unpaid, incomplete, incomplete_expired, paused): no Pro.
 * No trial is offered by Power Move IQ; "trialing" is honoured only if Stripe reports it.
 */
export const CLOCK_SKEW_DAYS = 1;
export const PAST_DUE_GRACE_DAYS = 7;
const DAY = 86400000;

export type SubLike = { status: string; current_period_end: string | null };

export function subscriptionGrantsPro(s: SubLike, now = Date.now()): boolean {
  const end = s.current_period_end ? new Date(s.current_period_end).getTime() : null;
  if (s.status === "active" || s.status === "trialing") return end === null || now <= end + CLOCK_SKEW_DAYS * DAY;
  if (s.status === "past_due") return end !== null && now <= end + PAST_DUE_GRACE_DAYS * DAY;
  return false;
}

export const anyGrantsPro = (subs: SubLike[], now = Date.now()) => subs.some((s) => subscriptionGrantsPro(s, now));
