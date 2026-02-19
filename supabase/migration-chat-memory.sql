-- ============================================
-- Chat Memory: Conversation persistence for AI
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_chat_messages_restaurant ON public.chat_messages(restaurant_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_messages_owner_access ON public.chat_messages
  FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
    )
  );

-- Auto-cleanup: keep only last 100 messages per restaurant
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.chat_messages
  WHERE restaurant_id = NEW.restaurant_id
    AND id NOT IN (
      SELECT id FROM public.chat_messages
      WHERE restaurant_id = NEW.restaurant_id
      ORDER BY created_at DESC
      LIMIT 100
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_chat_messages
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_chat_messages();
