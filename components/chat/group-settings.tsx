"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ConversationWithDetails,
  Profile,
} from "@/lib/types";
import {
  addGroupMember,
  removeGroupMember,
  renameGroup,
  updateGroupMemberRole,
} from "@/app/actions/group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Search, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

interface GroupSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationWithDetails;
  currentUserId: string;
  onGroupUpdated?: () => void;
}

export function GroupSettings({
  open,
  onOpenChange,
  conversation,
  currentUserId,
  onGroupUpdated,
}: GroupSettingsProps) {
  const [groupName, setGroupName] = useState(conversation.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const supabase = createClient();

  const isAdmin = conversation.participants.some(
    (p) => p.user_id === currentUserId && p.role === "admin"
  );

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !isAdmin) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const safeQuery = searchQuery.trim().replace(/[,%()]/g, "");
        if (safeQuery.length < 2) {
          setSearchResults([]);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", currentUserId)
          .or(`name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`)
          .limit(10);

        const memberIds = new Set(conversation.participants.map((p) => p.user_id));
        setSearchResults((data || []).filter((p) => !memberIds.has(p.id)));
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, isAdmin, conversation.participants, currentUserId, supabase]);

  const handleSaveGroupName = async () => {
    setIsSaving(true);
    try {
      await renameGroup(conversation.id, groupName);
      toast.success("Nome do grupo atualizado!");
      onGroupUpdated?.();
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar nome do grupo"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await addGroupMember(conversation.id, userId);
      toast.success("Membro adicionado ao grupo!");
      setSearchQuery("");
      setSearchResults([]);
      onGroupUpdated?.();
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao adicionar membro"
      );
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId !== currentUserId && !isAdmin) {
      toast.error("Você não tem permissão para remover membros");
      return;
    }

    try {
      await removeGroupMember(conversation.id, userId);

      if (userId === currentUserId) {
        toast.success("Você saiu do grupo");
        onOpenChange(false);
      } else {
        toast.success("Membro removido do grupo");
      }
      onGroupUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : userId === currentUserId
            ? "Erro ao sair do grupo"
            : "Erro ao remover membro"
      );
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!isAdmin) {
      toast.error("Você não tem permissão para promover membros");
      return;
    }

    try {
      await updateGroupMemberRole(conversation.id, userId, "admin");
      toast.success("Membro promovido a admin!");
      onGroupUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao promover membro"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações do Grupo</DialogTitle>
          <DialogDescription>
            Gerencie membros e configurações do grupo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="groupName">Nome do Grupo</Label>
              <div className="flex gap-2">
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Digite o novo nome"
                />
                <Button
                  onClick={handleSaveGroupName}
                  disabled={isSaving || groupName === conversation.name}
                  size="sm"
                >
                  {isSaving ? <Spinner className="mr-2" /> : null}
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="space-y-2">
              <Label>Adicionar Membros</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar usuários..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {isSearching ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : searchResults.length > 0 ? (
                <ScrollArea className="h-[200px] rounded-lg border p-2">
                  <div className="space-y-1">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-xs text-primary">
                              {user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddMember(user.id)}
                        >
                          Adicionar
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : null}
            </div>
          )}

          <div className="space-y-2">
            <Label>Membros ({conversation.participants.length})</Label>
            <ScrollArea className="h-[300px] rounded-lg border p-2">
              <div className="space-y-1">
                {conversation.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage
                          src={participant.profile?.avatar_url || undefined}
                        />
                        <AvatarFallback className="bg-primary/20 text-xs text-primary">
                          {participant.profile?.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {participant.profile?.name}
                          </p>
                          {participant.role === "admin" && (
                            <Shield className="h-3 w-3 flex-shrink-0 text-primary" />
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {participant.profile?.email}
                        </p>
                      </div>
                    </div>

                    {isAdmin && participant.user_id !== currentUserId && (
                      <div className="flex gap-1">
                        {participant.role === "member" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePromoteToAdmin(participant.user_id)}
                            title="Promover a admin"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMember(participant.user_id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {participant.user_id === currentUserId && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveMember(currentUserId)}
                      >
                        Sair
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

