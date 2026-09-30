CREATE TABLE public.guest_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_hash text NOT NULL UNIQUE,
  client_hash text NOT NULL,
  situation text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL,
  claimed_by uuid,
  claimed_analysis_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guest_analyses_client_idx ON public.guest_analyses (client_hash, created_at);
GRANT ALL ON public.guest_analyses TO service_role;
ALTER TABLE public.guest_analyses ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.guest_analyses IS 'One free pre-signup analysis per network; service-role only. Claimed into analyses after sign-in.';