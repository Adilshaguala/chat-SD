import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UsePresenceOptions {
  userId: string;
}

export function usePresence({ userId }: UsePresenceOptions) {
  const supabase = createClient();
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateOnlineStatus = useCallback(
    async (isOnline: boolean) => {
      try {
        await supabase
          .from("profiles")
          .update({
            is_online: isOnline,
            last_seen: new Date().toISOString(),
          })
          .eq("id", userId);
      } catch (error) {
        console.error("Error updating online status:", error);
      }
    },
    [userId, supabase]
  );

  useEffect(() => {
    // Set user as online
    updateOnlineStatus(true);

    // Update last_seen every 30 seconds
    updateIntervalRef.current = setInterval(() => {
      updateOnlineStatus(true);
    }, 30000);

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs/windows
        updateOnlineStatus(false);
      } else {
        // User is back
        updateOnlineStatus(true);
      }
    };

    // Handle beforeunload
    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Subscribe to presence updates
    const channel = supabase
      .channel(`presence-${userId}`)
      .on("presence", { event: "sync" }, () => {
        // Handle presence sync
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        // User joined
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        // User left
      })
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      supabase.removeChannel(channel);
      updateOnlineStatus(false);
    };
  }, [userId, updateOnlineStatus, supabase]);
}

export function useConversationPresence(conversationId: string, userId: string) {
  const supabase = createClient();
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateLastRead = async () => {
      try {
        await supabase
          .from("conversation_participants")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);
      } catch (error) {
        console.error("Error updating conversation presence:", error);
      }
    };

    // Update immediately
    updateLastRead();

    // Update every 10 seconds
    updateIntervalRef.current = setInterval(updateLastRead, 10000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [conversationId, userId, supabase]);
}

export function useLastSeenTime(timestamp: string | null): string {
  if (!timestamp) return "Nunca";

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `há ${diffDays}d`;

  return date.toLocaleDateString("pt-BR");
}
