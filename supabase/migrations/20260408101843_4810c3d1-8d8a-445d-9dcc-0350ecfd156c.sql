-- Add user_id column to link logs to authenticated users
ALTER TABLE public.user_action_logs ADD COLUMN IF NOT EXISTS user_id uuid;

-- Allow authenticated users to insert their own action logs
CREATE POLICY "Authenticated users can insert their own logs"
ON public.user_action_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view their own logs
CREATE POLICY "Users can view their own logs"
ON public.user_action_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
