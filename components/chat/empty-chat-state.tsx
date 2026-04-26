"use client";

import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

interface EmptyChatStateProps {
  onNewChat: () => void;
}

export function EmptyChatState({ onNewChat }: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-background">
      <div className="text-center max-w-sm px-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquarePlus className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Bem-vindo ao Luma Chat
        </h2>
        <p className="text-muted-foreground mb-6">
          Selecione uma conversa ou inicie uma nova para começar a trocar
          mensagens.
        </p>
        <Button onClick={onNewChat} className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Nova conversa
        </Button>
      </div>
    </div>
  );
}
