"use client";

import { ConversationWithDetails, Profile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Video,
  Phone,
  MoreVertical,
  Search,
  UserPlus,
  Bell,
  BellOff,
  Trash2,
} from "lucide-react";

interface ChatHeaderProps {
  conversation: ConversationWithDetails;
  currentUser: Profile;
  otherParticipant?: Profile;
  onBack?: () => void;
  isMobile?: boolean;
}

export function ChatHeader({
  conversation,
  currentUser,
  otherParticipant,
  onBack,
  isMobile,
}: ChatHeaderProps) {
  const displayName =
    conversation.type === "group"
      ? conversation.name || "Grupo"
      : otherParticipant?.name || "Usuário";

  const displayAvatar =
    conversation.type === "group"
      ? conversation.image_url
      : otherParticipant?.avatar_url;

  const isOnline =
    conversation.type === "private" && otherParticipant?.is_online;

  const participantCount = conversation.participants.length;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        {isMobile && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mr-1"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Voltar</span>
          </Button>
        )}

        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={displayAvatar || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-online border-2 border-card" />
          )}
        </div>

        <div>
          <h2 className="font-semibold text-foreground">{displayName}</h2>
          <p className="text-xs text-muted-foreground">
            {conversation.type === "group"
              ? `${participantCount} participantes`
              : isOnline
              ? "Online"
              : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Video className="h-5 w-5" />
          <span className="sr-only">Chamada de vídeo</span>
        </Button>

        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Phone className="h-5 w-5" />
          <span className="sr-only">Chamada de áudio</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreVertical className="h-5 w-5" />
              <span className="sr-only">Mais opções</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Search className="h-4 w-4 mr-2" />
              Pesquisar mensagens
            </DropdownMenuItem>
            {conversation.type === "group" && (
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar participante
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Bell className="h-4 w-4 mr-2" />
              Silenciar notificações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
