"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createGroupConversation } from "@/app/actions/chat";
import { searchUsers } from "@/app/actions/user";
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
import type { Profile } from "@/lib/types";
import { toast } from "sonner";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onGroupCreated: (conversationId: string) => void;
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

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error("[v0] Error searching users:", error);
      setSearchResults([]);
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

    if (selectedUsers.length < 2) {
      toast.error("Selecione pelo menos 2 membros para o grupo");
      return;
    }

    setIsCreating(true);
    try {
      const memberIds = selectedUsers.map((u) => u.id);
      const { conversationId } = await createGroupConversation(
        groupName,
        memberIds
      );

      toast.success("Grupo criado com sucesso!");
      onGroupCreated(conversationId);
      handleClose();
    } catch (error) {
      console.error("[v0] Error creating group:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar grupo"
      );
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
                onChange={(e) => handleSearchUsers(e.target.value)}
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
