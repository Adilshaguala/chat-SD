"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ConversationWithDetails,
  MessageWithDetails,
  Profile,
} from "@/lib/types";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { deleteMessage } from "@/app/actions/messages";
import { GroupSettings } from "./group-settings";
import useSWR from "swr";

interface ChatAreaProps {
  conversation: ConversationWithDetails;
  currentUser: Profile;
  onBack?: () => void;
  isMobile?: boolean;
  onConversationUpdated?: () => void;
}

async function fetchMessages(
  conversationId: string
): Promise<MessageWithDetails[]> {
  const supabase = createClient();

  const { data: messages } = await supabase
    .from("messages")
    .select(
      `
      *,
      sender:profiles(*),
      attachments:message_attachments(*),
      reactions:message_reactions(*),
      status:message_status(*)
    `
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (!messages) return [];

  // Get reply messages if any
  const replyIds = messages
    .filter((m) => m.reply_to_id)
    .map((m) => m.reply_to_id);

  let replyMessages: Record<string, MessageWithDetails> = {};

  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from("messages")
      .select("*, sender:profiles(*)")
      .in("id", replyIds);

    if (replies) {
      replyMessages = replies.reduce(
        (acc, reply) => ({
          ...acc,
          [reply.id]: reply,
        }),
        {}
      );
    }
  }

  return messages.map((message) => ({
    ...message,
    reply_to: message.reply_to_id
      ? replyMessages[message.reply_to_id]
      : undefined,
  }));
}

export function ChatArea({
  conversation,
  currentUser,
  onBack,
  isMobile,
  onConversationUpdated,
}: ChatAreaProps) {
  const [replyingTo, setReplyingTo] = useState<MessageWithDetails | null>(null);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: messages = [],
    mutate: refreshMessages,
  } = useSWR(`messages-${conversation.id}`, () =>
    fetchMessages(conversation.id)
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update last_read_at when viewing conversation
  useEffect(() => {
    const supabase = createClient();

    const updateLastRead = async () => {
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversation.id)
        .eq("user_id", currentUser.id);
    };

    updateLastRead();
  }, [conversation.id, currentUser.id, messages.length]);

  // Real-time subscription for messages
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          refreshMessages();
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
          refreshMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, refreshMessages]);

  const handleSendMessage = useCallback(
    async (
      content: string,
      type: "text" | "image" | "video" | "audio" | "file",
      attachments?: File[]
    ) => {
      const supabase = createClient();

      // Create the message
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: currentUser.id,
          content: type === "text" ? content : null,
          type,
          reply_to_id: replyingTo?.id || null,
        })
        .select()
        .single();

      if (error || !message) {
        console.error("Error sending message:", error);
        return;
      }

      // Create message status for all conversation participants
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversation.id);

      if (participants && participants.length > 0) {
        const statusRecords = participants.map((p) => ({
          message_id: message.id,
          user_id: p.user_id,
          status: p.user_id === currentUser.id ? "read" : "delivered",
        }));

        await supabase.from("message_status").insert(statusRecords);
      }

      // Upload attachments if any
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split(".").pop();
          const filePath = `${currentUser.id}/${conversation.id}/${message.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(filePath, file);

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

            await supabase.from("message_attachments").insert({
              message_id: message.id,
              file_url: publicUrl,
              file_name: file.name,
              file_type: type,
              file_size: file.size,
              mime_type: file.type,
            });
          }
        }
      }

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation.id);

      setReplyingTo(null);
      refreshMessages();
    },
    [conversation.id, currentUser.id, replyingTo, refreshMessages]
  );

  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const supabase = createClient();

      // Check if reaction exists
      const { data: existing } = await supabase
        .from("message_reactions")
        .select()
        .eq("message_id", messageId)
        .eq("user_id", currentUser.id)
        .eq("emoji", emoji)
        .single();

      if (existing) {
        // Remove reaction
        await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);
      } else {
        // Add reaction
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUser.id,
          emoji,
        });
      }

      refreshMessages();
    },
    [currentUser.id, refreshMessages]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      await deleteMessage(messageId);

      refreshMessages();
      onConversationUpdated?.();
    },
    [onConversationUpdated, refreshMessages]
  );

  const getOtherParticipant = () => {
    if (conversation.type === "group") return null;
    return conversation.participants.find((p) => p.user_id !== currentUser.id)
      ?.profile;
  };

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-background">
      <ChatHeader
        conversation={conversation}
        currentUser={currentUser}
        otherParticipant={getOtherParticipant() || undefined}
        onBack={onBack}
        isMobile={isMobile}
        onOpenGroupSettings={
          conversation.type === "group"
            ? () => setIsGroupSettingsOpen(true)
            : undefined
        }
      />

      <div className="min-h-0 flex-1">
        <MessageList
          messages={messages}
          currentUser={currentUser}
          onReply={setReplyingTo}
          onReaction={handleReaction}
          onDelete={handleDeleteMessage}
          messagesEndRef={messagesEndRef}
        />
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {conversation.type === "group" && (
        <GroupSettings
          open={isGroupSettingsOpen}
          onOpenChange={setIsGroupSettingsOpen}
          conversation={conversation}
          currentUserId={currentUser.id}
          onGroupUpdated={() => {
            refreshMessages();
            onConversationUpdated?.();
          }}
        />
      )}
    </div>
  );
}
