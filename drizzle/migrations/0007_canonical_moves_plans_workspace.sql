-- Canonical saved Moves (references catalog ids like mv_007; never reinterprets legacy numeric ids)
CREATE TABLE public.saved_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  move_ref text NOT NULL CHECK (move_ref ~ '^mv_[0-9]{3}$'),
  move_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, move_ref)
);
GRANT SELECT, INSERT, DELETE ON public.saved_moves TO authenticated;
GRANT ALL ON public.saved_moves TO service_role;
ALTER TABLE public.saved_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own saved moves" ON public.saved_moves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own saved moves" ON public.saved_moves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saved moves" ON public.saved_moves FOR DELETE TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE public.favorite_moves IS 'LEGACY: references the legacy filler moves table by numeric id. Not mapped to the canonical catalog; kept read-only for history. New saves go to saved_moves.';
COMMENT ON TABLE public.moves IS 'LEGACY: repeated filler content (10 distinct titles across 90 rows). Superseded by the canonical catalog in code; kept for legacy favorite references.';

-- Move Plans: client-owned editable plans derived from a recommendation
CREATE TABLE public.move_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  move_ref text CHECK (move_ref IS NULL OR move_ref ~ '^mv_[0-9]{3}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  current_version integer NOT NULL DEFAULT 1,
  draft jsonb,
  draft_saved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.move_plans TO authenticated;
GRANT ALL ON public.move_plans TO service_role;
ALTER TABLE public.move_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plans" ON public.move_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own plans for own analyses" ON public.move_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (analysis_id IS NULL OR EXISTS (SELECT 1 FROM public.analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid())));
CREATE POLICY "Users update own plans" ON public.move_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (analysis_id IS NULL OR EXISTS (SELECT 1 FROM public.analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid())));
CREATE INDEX move_plans_user_idx ON public.move_plans (user_id, status, updated_at DESC);

-- Immutable version history (original, edits, chosen alternatives, restores)
CREATE TABLE public.move_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.move_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  source text NOT NULL CHECK (source IN ('original','edit','alternative','restore')),
  content jsonb NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version)
);
GRANT SELECT, INSERT ON public.move_plan_versions TO authenticated;
GRANT ALL ON public.move_plan_versions TO service_role;
ALTER TABLE public.move_plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plan versions" ON public.move_plan_versions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add versions to own plans" ON public.move_plan_versions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.move_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));

-- User-confirmed vs inferred classification, kept separate from original input
ALTER TABLE public.analyses ADD COLUMN classification jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.analyses.classification IS 'User corrections to the inferred situation/goal: {"situation":..,"goal":..,"corrected_at":..}. Original context and AI inference are never overwritten.';

-- Outcome Memory links to the plan and canonical Move actually used
ALTER TABLE public.outcomes ADD COLUMN move_plan_id uuid REFERENCES public.move_plans(id) ON DELETE SET NULL;
ALTER TABLE public.outcomes ADD COLUMN chosen_move_ref text CHECK (chosen_move_ref IS NULL OR chosen_move_ref ~ '^mv_[0-9]{3}$');
ALTER TABLE public.outcomes ADD COLUMN lesson text NOT NULL DEFAULT '' CHECK (char_length(lesson) <= 2000);

CREATE OR REPLACE FUNCTION public.outcome_plan_owner_check()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.move_plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.move_plans p WHERE p.id = NEW.move_plan_id AND p.user_id = NEW.user_id
      AND (p.analysis_id IS NULL OR p.analysis_id = NEW.analysis_id)
  ) THEN
    RAISE EXCEPTION 'move plan does not belong to this user and case';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER outcomes_plan_owner BEFORE INSERT OR UPDATE ON public.outcomes
  FOR EACH ROW EXECUTE FUNCTION public.outcome_plan_owner_check();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER move_plans_touch BEFORE UPDATE ON public.move_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
