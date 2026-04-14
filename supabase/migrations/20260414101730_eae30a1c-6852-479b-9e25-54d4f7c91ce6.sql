
CREATE TABLE public.apidia_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  widget_type TEXT NOT NULL DEFAULT 'carousel' CHECK (widget_type IN ('carousel', 'grid', 'map')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_fiche_ids TEXT[] DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{"max_fiches": 10, "theme": "light"}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  share_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.apidia_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all widgets"
ON public.apidia_widgets
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX idx_apidia_widgets_share_token ON public.apidia_widgets(share_token);
