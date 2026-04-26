-- Chat Application Database Schema
-- Version: 1.0

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONVERSATIONS TABLE (for both private and groups)
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('private', 'group')),
  name TEXT, -- Only for groups
  image_url TEXT, -- Only for groups
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONVERSATION PARTICIPANTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'file', 'deleted')),
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MESSAGE ATTACHMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- For audio/video in seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MESSAGE STATUS (read receipts)
-- =============================================
CREATE TABLE IF NOT EXISTS public.message_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- =============================================
-- MESSAGE REACTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON public.message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(name);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Conversations policies
CREATE POLICY "conversations_select_participant" ON public.conversations FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));
CREATE POLICY "conversations_insert_authenticated" ON public.conversations FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conversations_update_participant" ON public.conversations FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));

-- Conversation participants policies
CREATE POLICY "participants_select_own_conversations" ON public.conversation_participants FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()));
CREATE POLICY "participants_insert_authenticated" ON public.conversation_participants FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "participants_update_own" ON public.conversation_participants FOR UPDATE 
  USING (user_id = auth.uid());
CREATE POLICY "participants_delete_admin" ON public.conversation_participants FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = conversation_participants.conversation_id AND user_id = auth.uid() AND role = 'admin'));

-- Messages policies
CREATE POLICY "messages_select_participant" ON public.messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "messages_insert_participant" ON public.messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()) AND sender_id = auth.uid());
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE 
  USING (sender_id = auth.uid());
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE 
  USING (sender_id = auth.uid());

-- Message attachments policies
CREATE POLICY "attachments_select_participant" ON public.message_attachments FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id WHERE m.id = message_id AND cp.user_id = auth.uid()));
CREATE POLICY "attachments_insert_own_message" ON public.message_attachments FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.messages WHERE id = message_id AND sender_id = auth.uid()));

-- Message status policies
CREATE POLICY "status_select_participant" ON public.message_status FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id WHERE m.id = message_id AND cp.user_id = auth.uid()));
CREATE POLICY "status_insert_authenticated" ON public.message_status FOR INSERT 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "status_update_own" ON public.message_status FOR UPDATE 
  USING (user_id = auth.uid());

-- Message reactions policies
CREATE POLICY "reactions_select_participant" ON public.message_reactions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id WHERE m.id = message_id AND cp.user_id = auth.uid()));
CREATE POLICY "reactions_insert_participant" ON public.message_reactions FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id WHERE m.id = message_id AND cp.user_id = auth.uid()) AND user_id = auth.uid());
CREATE POLICY "reactions_delete_own" ON public.message_reactions FOR DELETE 
  USING (user_id = auth.uid());

-- =============================================
-- TRIGGER FOR AUTO-CREATING PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FUNCTION TO UPDATE PROFILE TIMESTAMP
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
