import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseTypingIndicatorOptions {
  conversationId: string;
  userId: string;
}

const TYPING_TIMEOUT = 3000; // 3 seconds

export function useTypingIndicator({
  conversationId,
  userId,
}: UseTypingIndicatorOptions) {
  const supabase = createClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      // Broadcast typing status using channel
      const channel = supabase.channel(`typing-${conversationId}`);
      channel
        .send("broadcast", {
          event: "typing",
          user_id: userId,
          timestamp: Date.now(),
        })
        .then(() => {
          // Send successful
        });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT);
  }, [conversationId, userId, supabase]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      const channel = supabase.channel(`typing-${conversationId}`);
      channel
        .send("broadcast", {
          event: "stop_typing",
          user_id: userId,
          timestamp: Date.now(),
        })
        .then(() => {
          // Send successful
        });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [conversationId, userId, supabase]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    };
  }, [stopTyping]);

  return { startTyping, stopTyping };
}

export function useTypingUsers(conversationId: string) {
  const supabase = createClient();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        setTypingUsers((prev) => new Set([...prev, payload.user_id]));

        // Clear existing timeout for this user
        const existingTimeout = typingTimeoutsRef.current.get(payload.user_id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout to remove user from typing list
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(payload.user_id);
            return newSet;
          });
          typingTimeoutsRef.current.delete(payload.user_id);
        }, TYPING_TIMEOUT + 1000);

        typingTimeoutsRef.current.set(payload.user_id, timeout);
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(payload.user_id);
          return newSet;
        });

        const timeout = typingTimeoutsRef.current.get(payload.user_id);
        if (timeout) {
          clearTimeout(timeout);
          typingTimeoutsRef.current.delete(payload.user_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [conversationId, supabase]);

  return typingUsers;
}
