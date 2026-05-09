import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseMessageRealtimeOptions {
  conversationId: string;
  onMessageChange?: () => void;
}

export function useMessageRealtime({
  conversationId,
  onMessageChange,
}: UseMessageRealtimeOptions) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to message changes
    channelRef.current = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          onMessageChange?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          onMessageChange?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_status",
        },
        () => {
          onMessageChange?.();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, onMessageChange]);
}

export function useConversationPresence(conversationId: string) {
  const supabase = createClient();

  useEffect(() => {
    // Update that user is viewing this conversation
    const updatePresence = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Update last_read_at timestamp
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
    };

    updatePresence();

    // Update every 10 seconds while user is on the conversation
    const interval = setInterval(updatePresence, 10000);

    return () => clearInterval(interval);
  }, [conversationId, supabase]);
}
