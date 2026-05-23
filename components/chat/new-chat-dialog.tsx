"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createPrivateConversation,
  createGroupConversation,
} from "@/app/actions/chat";
import { searchUsers } from "@/app/actions/user";
import { Profile } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: Profile;
  onConversationCreated: (conversationId: string) => void;
}

export function NewChatDialog({
  open,
  onOpenChange,
  currentUser,
  onConversationCreated,
}: NewChatDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("private");

  // Search users by name or email
  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchUsers(searchQuery);
        setUsers(results);
      } catch (error) {
        console.error("[v0] Error searching users:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log("[v0] Search error details:", errorMessage);
        toast.error("Erro ao buscar usuários");
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleUserSelect = (user: Profile) => {
    if (activeTab === "private") {
      // For private chat, create immediately
      handleCreatePrivateChat(user.id);
    } else {
      // For group, toggle selection
      setSelectedUsers((prev) =>
        prev.some((u) => u.id === user.id)
          ? prev.filter((u) => u.id !== user.id)
          : [...prev, user]
      );
    }
  };

  const handleCreatePrivateChat = async (otherUserId: string) => {
    setIsCreating(true);
    try {
      const { conversationId } = await createPrivateConversation(otherUserId);
      toast.success("Conversa criada com sucesso!");
      onConversationCreated(conversationId);
      resetDialog();
    } catch (error) {
      console.error("[v0] Error creating private chat:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log("[v0] Chat creation error details:", errorMessage);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar conversa"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateGroupChat = async () => {
    if (selectedUsers.length < 2) {
      toast.error("Selecione pelo menos 2 participantes");
      return;
    }

    if (!groupName.trim()) {
      toast.error("Digite um nome para o grupo");
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
      onConversationCreated(conversationId);
      resetDialog();
    } catch (error) {
      console.error("[v0] Error creating group:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar grupo"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const resetDialog = () => {
    setSearchQuery("");
    setUsers([]);
    setSelectedUsers([]);
    setGroupName("");
    setActiveTab("private");
    onOpenChange(false);
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some((u) => u.id === userId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="private" className="gap-2">
              <User className="h-4 w-4" />
              Privado
            </TabsTrigger>
            <TabsTrigger value="group" className="gap-2">
              <Users className="h-4 w-4" />
              Grupo
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Group name input (only for group tab) */}
            {activeTab === "group" && (
              <Input
                placeholder="Nome do grupo"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selected users (for group) - now shows from selectedUsers array */}
            {activeTab === "group" && selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full text-sm"
                  >
                    <span>{user.name}</span>
                    <button
                      onClick={() => removeSelectedUser(user.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* User list */}
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery
                    ? "Nenhum usuário encontrado"
                    : "Digite para pesquisar usuários"}
                </div>
              ) : (
                <div className="space-y-1">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      disabled={isCreating}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      {activeTab === "group" && (
                        <Checkbox
                          checked={isUserSelected(user.id)}
                          onCheckedChange={() => handleUserSelect(user)}
                        />
                      )}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      {user.is_online && (
                        <span className="h-2 w-2 rounded-full bg-online" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Create group button */}
            {activeTab === "group" && (
              <Button
                onClick={handleCreateGroupChat}
                disabled={
                  selectedUsers.length < 2 || !groupName.trim() || isCreating
                }
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Criar grupo ({selectedUsers.length} selecionados)
                  </>
                )}
              </Button>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
