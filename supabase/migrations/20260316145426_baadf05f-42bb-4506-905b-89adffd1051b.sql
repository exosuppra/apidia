
CREATE TABLE public.admin_dashboard_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  section_order jsonb NOT NULL DEFAULT '["rh-admin","donnees-touristiques","reseaux-sociaux","projet-web"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_dashboard_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order"
  ON public.admin_dashboard_order FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own order"
  ON public.admin_dashboard_order FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own order"
  ON public.admin_dashboard_order FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
