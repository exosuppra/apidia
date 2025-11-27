-- Create editorial_plannings table
CREATE TABLE public.editorial_plannings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.editorial_plannings ENABLE ROW LEVEL SECURITY;

-- RLS policies for editorial_plannings
CREATE POLICY "Users can view their own plannings"
  ON public.editorial_plannings
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own plannings"
  ON public.editorial_plannings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own plannings"
  ON public.editorial_plannings
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own plannings"
  ON public.editorial_plannings
  FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all plannings"
  ON public.editorial_plannings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add planning_id to tasks table
ALTER TABLE public.tasks ADD COLUMN planning_id UUID REFERENCES public.editorial_plannings(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_tasks_planning_id ON public.tasks(planning_id);
CREATE INDEX idx_editorial_plannings_created_by ON public.editorial_plannings(created_by);

-- Trigger for updated_at
CREATE TRIGGER update_editorial_plannings_updated_at
  BEFORE UPDATE ON public.editorial_plannings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();