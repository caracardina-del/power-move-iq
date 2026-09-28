CREATE TABLE public.stripe_subscriptions (
  stripe_subscription_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'incomplete',
  plan text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  last_event_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stripe_subscriptions_user_idx ON public.stripe_subscriptions(user_id);
CREATE INDEX stripe_subscriptions_customer_idx ON public.stripe_subscriptions(stripe_customer_id);
GRANT SELECT ON public.stripe_subscriptions TO authenticated;
GRANT ALL ON public.stripe_subscriptions TO service_role;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own stripe subscriptions" ON public.stripe_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
INSERT INTO public.stripe_subscriptions (stripe_subscription_id, user_id, stripe_customer_id, status, plan, current_period_end, cancel_at_period_end, last_event_at)
SELECT stripe_subscription_id, user_id, stripe_customer_id, status, plan, current_period_end, cancel_at_period_end, last_event_at
FROM public.subscriptions WHERE stripe_subscription_id IS NOT NULL AND stripe_subscription_id <> ''
ON CONFLICT (stripe_subscription_id) DO NOTHING;