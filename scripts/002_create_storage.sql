-- Storage bucket used by chat attachments.
-- Run this in Supabase SQL Editor after scripts/001_create_schema.sql.

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'chat_attachments_select_public'
  ) THEN
    CREATE POLICY "chat_attachments_select_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'chat_attachments_insert_authenticated'
  ) THEN
    CREATE POLICY "chat_attachments_insert_authenticated"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'chat-attachments'
      AND auth.uid() IS NOT NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'chat_attachments_update_authenticated'
  ) THEN
    CREATE POLICY "chat_attachments_update_authenticated"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'chat-attachments'
      AND auth.uid() IS NOT NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'chat_attachments_delete_authenticated'
  ) THEN
    CREATE POLICY "chat_attachments_delete_authenticated"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'chat-attachments'
      AND auth.uid() IS NOT NULL
    );
  END IF;
END $$;
