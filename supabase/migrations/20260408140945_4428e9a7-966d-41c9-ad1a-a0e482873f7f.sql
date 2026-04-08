-- Table singleton pour tracker l'offset getUpdates
CREATE TABLE public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access telegram_bot_state"
ON public.telegram_bot_state FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Table pour stocker les messages Telegram
CREATE TABLE public.telegram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id bigint UNIQUE,
  chat_id bigint NOT NULL,
  text text,
  direction text NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing')),
  sender_name text,
  raw_update jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_messages_chat_id ON public.telegram_messages (chat_id);
CREATE INDEX idx_telegram_messages_created_at ON public.telegram_messages (created_at DESC);

ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage telegram_messages"
ON public.telegram_messages FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access telegram_messages"
ON public.telegram_messages FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_messages;