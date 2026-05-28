-- =============================================
-- Chat schema hardening (RLS + group roles + storage ownership)
-- Run this AFTER scripts/001_create_schema.sql
-- =============================================

-- -------- Helpers to avoid recursive RLS checks --------
CREATE OR REPLACE FUNCTION public.is_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_conversation_id(p_message_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT conversation_id FROM public.messages WHERE id = p_message_id;
$$;

-- -------- Conversations --------
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_creator" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_admin" ON public.conversations;

CREATE POLICY "conversations_select_participant"
  ON public.conversations FOR SELECT
  USING (public.is_participant(id) OR created_by = auth.uid());

CREATE POLICY "conversations_insert_authenticated"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "conversations_update_participant"
  ON public.conversations FOR UPDATE
  USING (public.is_participant(id));

CREATE POLICY "conversations_delete_admin"
  ON public.conversations FOR DELETE
  USING (public.is_admin(id) OR created_by = auth.uid());

-- -------- Participants --------
DROP POLICY IF EXISTS "participants_select_own_conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_select_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_select_in_conversation" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_insert_authenticated" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_update_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_delete_admin" ON public.conversation_participants;

CREATE POLICY "participants_select_in_conversation"
  ON public.conversation_participants FOR SELECT
  USING (public.is_participant(conversation_id));

CREATE POLICY "participants_insert_authenticated"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "participants_update_own"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin(conversation_id));

CREATE POLICY "participants_delete_admin"
  ON public.conversation_participants FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin(conversation_id));

-- -------- Messages --------
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;

CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (public.is_participant(conversation_id));

CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    public.is_participant(conversation_id)
    AND sender_id = auth.uid()
  );

CREATE POLICY "messages_update_own"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid() OR public.is_admin(conversation_id));

CREATE POLICY "messages_delete_own"
  ON public.messages FOR DELETE
  USING (sender_id = auth.uid() OR public.is_admin(conversation_id));

-- -------- Attachments / status / reactions --------
DROP POLICY IF EXISTS "attachments_select_participant" ON public.message_attachments;
DROP POLICY IF EXISTS "attachments_insert_own_message" ON public.message_attachments;
CREATE POLICY "attachments_select_participant"
  ON public.message_attachments FOR SELECT
  USING (public.is_participant(public.get_conversation_id(message_id)));

CREATE POLICY "attachments_insert_own_message"
  ON public.message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE id = message_id
      AND sender_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "status_select_participant" ON public.message_status;
DROP POLICY IF EXISTS "status_insert_authenticated" ON public.message_status;
DROP POLICY IF EXISTS "status_update_own" ON public.message_status;
CREATE POLICY "status_select_participant"
  ON public.message_status FOR SELECT
  USING (public.is_participant(public.get_conversation_id(message_id)));

CREATE POLICY "status_insert_authenticated"
  ON public.message_status FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "status_update_own"
  ON public.message_status FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reactions_select_participant" ON public.message_reactions;
DROP POLICY IF EXISTS "reactions_insert_participant" ON public.message_reactions;
DROP POLICY IF EXISTS "reactions_delete_own" ON public.message_reactions;
CREATE POLICY "reactions_select_participant"
  ON public.message_reactions FOR SELECT
  USING (public.is_participant(public.get_conversation_id(message_id)));

CREATE POLICY "reactions_insert_participant"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    public.is_participant(public.get_conversation_id(message_id))
    AND user_id = auth.uid()
  );

CREATE POLICY "reactions_delete_own"
  ON public.message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- -------- Storage bucket + owner-based policies --------
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_attachments_select_public" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete_owner" ON storage.objects;

CREATE POLICY "chat_attachments_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_insert_authenticated"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND (auth.uid())::text = split_part(name, '/', 1)
  );

CREATE POLICY "chat_attachments_update_owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chat-attachments'
    AND (auth.uid())::text = split_part(name, '/', 1)
  );

CREATE POLICY "chat_attachments_delete_owner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-attachments'
    AND (auth.uid())::text = split_part(name, '/', 1)
  );

