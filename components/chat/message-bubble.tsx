"use client";

import { useState } from "react";
import { MessageWithDetails } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Reply,
  Smile,
  Trash2,
  Download,
  Play,
  FileText,
  Check,
  CheckCheck,
} from "lucide-react";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: MessageWithDetails;
  isOwn: boolean;
  showAvatar: boolean;
  onReply: () => void;
  onReaction: (emoji: string) => void;
  onDelete: () => void;
  currentUserId: string;
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  onReply,
  onReaction,
  onDelete,
  currentUserId,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  // Check read status
  const isRead = message.status?.some(
    (s) => s.user_id !== currentUserId && s.status === "read"
  );
  const isDelivered = message.status?.some(
    (s) => s.user_id !== currentUserId && s.status === "delivered"
  );

  // Group reactions by emoji
  const reactionGroups = message.reactions?.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = { count: 0, hasOwn: false };
      }
      acc[reaction.emoji].count++;
      if (reaction.user_id === currentUserId) {
        acc[reaction.emoji].hasOwn = true;
      }
      return acc;
    },
    {} as Record<string, { count: number; hasOwn: boolean }>
  );

  const renderContent = () => {
    if (message.is_deleted) {
      return (
        <p className="text-muted-foreground italic text-sm">
          Mensagem apagada
        </p>
      );
    }

    switch (message.type) {
      case "text":
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );

      case "image":
        return (
          <div className="space-y-2">
            {message.attachments?.length === 1 ? (
              <img
                src={message.attachments[0].file_url}
                alt={message.attachments[0].file_name}
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              />
            ) : message.attachments && message.attachments.length > 1 ? (
              <div className="grid grid-cols-2 gap-1 max-w-xs">
                {message.attachments.slice(0, 4).map((attachment, index) => (
                  <div key={attachment.id} className="relative aspect-square">
                    <img
                      src={attachment.file_url}
                      alt={attachment.file_name}
                      className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    {index === 3 && message.attachments!.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg font-semibold">
                          +{message.attachments!.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>
        );

      case "video":
        const videoAttachment = message.attachments?.[0];
        return videoAttachment ? (
          <div className="relative max-w-xs">
            <video
              src={videoAttachment.file_url}
              className="rounded-lg w-full"
              controls
              preload="metadata"
            />
            {videoAttachment.duration && (
              <span className="absolute top-2 right-2 px-1.5 py-0.5 text-xs bg-black/70 text-white rounded">
                {Math.floor(videoAttachment.duration / 60)}:
                {(videoAttachment.duration % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>
        ) : null;

      case "audio":
        const audioAttachment = message.attachments?.[0];
        return audioAttachment ? (
          <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg min-w-[200px]">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <Play className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="h-1 bg-muted rounded-full">
                <div className="h-full w-0 bg-primary rounded-full" />
              </div>
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>0:00</span>
                <span>
                  {audioAttachment.duration
                    ? `${Math.floor(audioAttachment.duration / 60)}:${(
                        audioAttachment.duration % 60
                      )
                        .toString()
                        .padStart(2, "0")}`
                    : "0:00"}
                </span>
              </div>
            </div>
          </div>
        ) : null;

      case "file":
        const fileAttachment = message.attachments?.[0];
        return fileAttachment ? (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {fileAttachment.file_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(fileAttachment.file_size / 1024).toFixed(0)}KB
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" asChild>
                <a href={fileAttachment.file_url} download>
                  Download
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={fileAttachment.file_url} target="_blank" rel="noopener noreferrer">
                  Preview
                </a>
              </Button>
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 mb-3 group",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {message.sender?.name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div
        className={cn("flex flex-col max-w-[70%]", isOwn ? "items-end" : "items-start")}
      >
        {/* Reply preview */}
        {message.reply_to && (
          <div
            className={cn(
              "text-xs px-3 py-1.5 mb-1 rounded-lg border-l-2 border-primary/50 bg-muted/50",
              isOwn ? "mr-2" : "ml-2"
            )}
          >
            <span className="font-medium text-primary">
              {message.reply_to.sender?.name}
            </span>
            <p className="text-muted-foreground truncate max-w-[200px]">
              {message.reply_to.content}
            </p>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "relative px-3 py-2 rounded-2xl",
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border rounded-tl-sm"
          )}
        >
          {renderContent()}

          {/* Time and status */}
          <div
            className={cn(
              "flex items-center gap-1 mt-1",
              isOwn ? "justify-end" : "justify-start"
            )}
          >
            <span
              className={cn(
                "text-[10px]",
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {format(new Date(message.created_at), "HH:mm")}
            </span>
            {isOwn && !message.is_deleted && (
              <span
                className={cn(
                  "text-primary-foreground/70",
                  isRead && "text-primary-foreground"
                )}
              >
                {isRead ? (
                  <CheckCheck className="h-3.5 w-3.5" />
                ) : isDelivered ? (
                  <CheckCheck className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reactions */}
        {reactionGroups && Object.keys(reactionGroups).length > 0 && (
          <div className={cn("flex gap-1 mt-1", isOwn ? "mr-2" : "ml-2")}>
            {Object.entries(reactionGroups).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => onReaction(emoji)}
                className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs",
                  data.hasOwn
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span>{emoji}</span>
                {data.count > 1 && <span>{data.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && !message.is_deleted && (
        <div
          className={cn(
            "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="flex gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReaction(emoji)}
                    className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReply}>
            <Reply className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? "end" : "start"}>
              <DropdownMenuItem onClick={onReply}>
                <Reply className="h-4 w-4 mr-2" />
                Responder
              </DropdownMenuItem>
              {isOwn && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
