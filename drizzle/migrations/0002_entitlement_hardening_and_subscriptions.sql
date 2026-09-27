-- 1) Users may only update safe profile columns; subscription_tier is server-only.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, preferences, updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_subscription_tier()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     AND coalesce(auth.role(), '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'subscription_tier can only be changed by verified billing';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_guard_tier ON public.profiles;
CREATE TRIGGER profiles_guard_tier BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_subscription_tier();

-- 2) Pro check helper (reads the caller's own tier).
CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND subscription_tier = 'pro')
$$;

-- 3) Outcome Memory writes require Pro at the database level.
DROP POLICY IF EXISTS "Users create own outcomes" ON public.outcomes;
CREATE POLICY "Pro users create own outcomes" ON public.outcomes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_pro(auth.uid())
  AND EXISTS (SELECT 1 FROM public.analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()));

-- 4) Verified billing state, written only by the server (service role).
CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'incomplete',
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);