
CREATE TABLE public.apidia_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.apidia_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage apidia_knowledge"
  ON public.apidia_knowledge
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_apidia_knowledge_updated_at
  BEFORE UPDATE ON public.apidia_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
