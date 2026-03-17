ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE TABLE IF NOT EXISTS public.task_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own seen status"
  ON public.task_seen FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all task_seen"
  ON public.task_seen FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));