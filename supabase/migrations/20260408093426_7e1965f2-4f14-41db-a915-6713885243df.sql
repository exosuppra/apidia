CREATE TABLE public.linking_check_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_status text DEFAULT 'idle',
  current_total integer DEFAULT 0,
  current_checked integer DEFAULT 0,
  current_errors integer DEFAULT 0,
  current_site_url text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.linking_check_config (id) VALUES (gen_random_uuid());

ALTER TABLE public.linking_check_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage linking_check_config"
  ON public.linking_check_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access linking_check_config"
  ON public.linking_check_config FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);