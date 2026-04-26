"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Search, Users } from "lucide-react";
import type { Profile, Conversation } from "@/lib/types";
import { toast } from "sonner";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onGroupCreated: (conversation: Conversation) => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  currentUserId,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const supabase = createClient();

  const searchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUserId)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleUserSelection = (user: Profile) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Por favor, insira um nome para o grupo");
      return;
    }

    if (selectedUsers.length < 1) {
      toast.error("Selecione pelo menos 1 membro para o grupo");
      return;
    }

    setIsCreating(true);
    try {
      // Create the group conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          type: "group",
          name: groupName.trim(),
          created_by: currentUserId,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add current user as admin
      const { error: adminError } = await supabase
        .from("conversation_participants")
        .insert({
          conversation_id: conversation.id,
          user_id: currentUserId,
          role: "admin",
        });

      if (adminError) throw adminError;

      // Add selected users as members
      const participantInserts = selectedUsers.map((user) => ({
        conversation_id: conversation.id,
        user_id: user.id,
        role: "member",
      }));

      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert(participantInserts);

      if (participantsError) throw participantsError;

      // Fetch the complete conversation with participants
      const { data: fullConversation, error: fetchError } = await supabase
        .from("conversations")
        .select(
          `
          *,
          participants:conversation_participants(
            user_id,
            role,
            profile:profiles(*)
          )
        `
        )
        .eq("id", conversation.id)
        .single();

      if (fetchError) throw fetchError;

      toast.success("Grupo criado com sucesso!");
      onGroupCreated(fullConversation as Conversation);
      handleClose();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Erro ao criar grupo. Tente novamente.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUsers([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Criar Novo Grupo
          </DialogTitle>
          <DialogDescription>
            Crie um grupo para conversar com várias pessoas ao mesmo tempo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Nome do Grupo</Label>
            <Input
              id="group-name"
              placeholder="Ex: Equipe de Trabalho"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Adicionar Membros</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => searchUsers(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Selecionados ({selectedUsers.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-sm"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground">{user.name}</span>
                    <button
                      onClick={() => toggleUserSelection(user)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ScrollArea className="h-48 rounded-md border">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="p-2 space-y-1">
                {searchResults.map((user) => {
                  const isSelected = selectedUsers.some(
                    (u) => u.id === user.id
                  );
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent cursor-pointer"
                      onClick={() => toggleUserSelection(user)}
                    >
                      <Checkbox checked={isSelected} />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mb-2" />
                <p className="text-sm">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mb-2" />
                <p className="text-sm">Busque usuários para adicionar</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={createGroup}
            disabled={
              isCreating || !groupName.trim() || selectedUsers.length < 1
            }
          >
            {isCreating ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Criando...
              </>
            ) : (
              "Criar Grupo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
