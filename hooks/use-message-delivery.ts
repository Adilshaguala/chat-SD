import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageWithDetails } from "@/lib/types";

interface UseMessageDeliveryOptions {
  conversationId: string;
  currentUserId: string;
  messages: MessageWithDetails[];
}

export function useMessageDelivery({
  conversationId,
  currentUserId,
  messages,
}: UseMessageDeliveryOptions) {
  useEffect(() => {
    const updateMessageStatus = async () => {
      const supabase = createClient();

      // Find messages from other users that haven't been marked as delivered
      const messagesToUpdate = messages.filter((message) => {
        // Skip messages sent by current user
        if (message.sender_id === currentUserId) return false;

        // Check if this message has a delivered status for current user
        const hasDeliveredStatus = message.status?.some(
          (s) => s.user_id === currentUserId && s.status !== "sent"
        );

        return !hasDeliveredStatus;
      });

      if (messagesToUpdate.length === 0) return;

      // Update status for all messages to "delivered"
      for (const message of messagesToUpdate) {
        // Check if status record exists
        const { data: existingStatus } = await supabase
          .from("message_status")
          .select()
          .eq("message_id", message.id)
          .eq("user_id", currentUserId)
          .single();

        if (existingStatus) {
          // Update existing status
          await supabase
            .from("message_status")
            .update({
              status: "delivered",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingStatus.id);
        } else {
          // Create new status record
          await supabase.from("message_status").insert({
            message_id: message.id,
            user_id: currentUserId,
            status: "delivered",
          });
        }
      }
    };

    updateMessageStatus();
  }, [conversationId, currentUserId, messages]);
}

export function useMessageRead(
  conversationId: string,
  currentUserId: string,
  messages: MessageWithDetails[]
) {
  useEffect(() => {
    // Delay marking as read - wait 1 second to avoid marking as read immediately
    const timeout = setTimeout(async () => {
      const supabase = createClient();

      // Find messages from other users that should be marked as read
      const messagesToUpdate = messages.filter((message) => {
        if (message.sender_id === currentUserId) return false;

        const readStatus = message.status?.find(
          (s) => s.user_id === currentUserId
        );

        return readStatus?.status !== "read";
      });

      if (messagesToUpdate.length === 0) return;

      // Update or create read status for all messages
      for (const message of messagesToUpdate) {
        const { data: existingStatus } = await supabase
          .from("message_status")
          .select()
          .eq("message_id", message.id)
          .eq("user_id", currentUserId)
          .single();

        if (existingStatus) {
          await supabase
            .from("message_status")
            .update({
              status: "read",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingStatus.id);
        } else {
          await supabase.from("message_status").insert({
            message_id: message.id,
            user_id: currentUserId,
            status: "read",
          });
        }
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [conversationId, currentUserId, messages]);
}
