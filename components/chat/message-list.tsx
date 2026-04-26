"use client";

import { RefObject } from "react";
import { MessageWithDetails, Profile } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessageListProps {
  messages: MessageWithDetails[];
  currentUser: Profile;
  onReply: (message: MessageWithDetails) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  messagesEndRef: RefObject<HTMLDivElement>;
}

function formatDateDivider(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

export function MessageList({
  messages,
  currentUser,
  onReply,
  onReaction,
  onDelete,
  messagesEndRef,
}: MessageListProps) {
  // Group messages by date
  const groupedMessages: { date: Date; messages: MessageWithDetails[] }[] = [];

  messages.forEach((message) => {
    const messageDate = new Date(message.created_at);
    const lastGroup = groupedMessages[groupedMessages.length - 1];

    if (lastGroup && isSameDay(lastGroup.date, messageDate)) {
      lastGroup.messages.push(message);
    } else {
      groupedMessages.push({
        date: messageDate,
        messages: [message],
      });
    }
  });

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="py-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date divider */}
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 text-xs text-muted-foreground bg-muted rounded-full">
                {formatDateDivider(group.date)}
              </span>
            </div>

            {/* Messages */}
            {group.messages.map((message, messageIndex) => {
              const isOwn = message.sender_id === currentUser.id;
              const prevMessage = group.messages[messageIndex - 1];
              const showAvatar =
                !isOwn &&
                (!prevMessage || prevMessage.sender_id !== message.sender_id);

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  onReply={() => onReply(message)}
                  onReaction={(emoji) => onReaction(message.id, emoji)}
                  onDelete={() => onDelete(message.id)}
                  currentUserId={currentUser.id}
                />
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
