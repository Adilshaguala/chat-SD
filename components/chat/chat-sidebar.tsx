"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ConversationWithDetails, Profile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Plus, Search, Check, CheckCheck, LogOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ChatSidebarProps {
  conversations: ConversationWithDetails[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentUser: Profile;
  className?: string;
}

export function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewChat,
  searchQuery,
  onSearchChange,
  currentUser,
  className,
}: ChatSidebarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getConversationDisplay = (conversation: ConversationWithDetails) => {
    if (conversation.type === "group") {
      return {
        name: conversation.name || "Grupo",
        avatar: conversation.image_url,
        isOnline: false,
      };
    }

    // For private chats, show the other participant
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== currentUser.id
    );

    return {
      name: otherParticipant?.profile?.name || "Usuário",
      avatar: otherParticipant?.profile?.avatar_url,
      isOnline: otherParticipant?.profile?.is_online || false,
    };
  };

  const getMessagePreview = (conversation: ConversationWithDetails) => {
    const message = conversation.last_message;
    if (!message) return "Nenhuma mensagem ainda";

    const isSentByMe = message.sender_id === currentUser.id;
    const prefix = isSentByMe ? "" : "";

    switch (message.type) {
      case "image":
        return `${prefix}Imagem`;
      case "video":
        return `${prefix}Vídeo`;
      case "audio":
        return `${prefix}Áudio`;
      case "file":
        return `${prefix}Arquivo`;
      case "deleted":
        return "Mensagem apagada";
      default:
        return `${prefix}${message.content || ""}`;
    }
  };

  const getMessageTime = (conversation: ConversationWithDetails) => {
    const message = conversation.last_message;
    if (!message) return "";

    return formatDistanceToNow(new Date(message.created_at), {
      addSuffix: false,
      locale: ptBR,
    });
  };

  const getMessageStatus = (conversation: ConversationWithDetails) => {
    const message = conversation.last_message;
    if (!message || message.sender_id !== currentUser.id) return null;

    // Check if message was read by other participants
    const otherParticipants = conversation.participants.filter(
      (p) => p.user_id !== currentUser.id
    );

    const allRead = otherParticipants.every((p) => {
      if (!p.last_read_at) return false;
      return new Date(p.last_read_at) >= new Date(message.created_at);
    });

    return allRead ? "read" : "delivered";
  };

  return (
    <div className={cn("flex flex-col h-full bg-sidebar", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <h1 className="text-xl font-semibold text-sidebar-foreground">Chats</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Plus className="h-5 w-5" />
          <span className="sr-only">Novo chat</span>
        </Button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar chats..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-sidebar-accent border-0 focus-visible:ring-1 focus-visible:ring-sidebar-ring"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="px-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma conversa encontrada</p>
              <Button
                variant="link"
                onClick={onNewChat}
                className="mt-2 text-primary"
              >
                Iniciar nova conversa
              </Button>
            </div>
          ) : (
            conversations.map((conversation) => {
              const display = getConversationDisplay(conversation);
              const isSelected = conversation.id === selectedConversationId;
              const messageStatus = getMessageStatus(conversation);

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                    isSelected
                      ? "bg-sidebar-accent"
                      : "hover:bg-sidebar-accent/50"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={display.avatar || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {display.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {display.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-sidebar" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sidebar-foreground truncate">
                        {display.name}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {getMessageTime(conversation)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        {messageStatus && (
                          <span
                            className={cn(
                              "flex-shrink-0",
                              messageStatus === "read"
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                          >
                            {messageStatus === "read" ? (
                              <CheckCheck className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground truncate">
                          {getMessagePreview(conversation)}
                        </span>
                      </div>
                      {conversation.unread_count > 0 && (
                        <span className="flex-shrink-0 ml-2 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* User Profile and Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentUser.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sidebar-foreground truncate text-sm">
              {currentUser.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentUser.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
