"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ConversationWithDetails,
  Profile,
  ConversationParticipant,
} from "@/lib/types";
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

  // Check if current user is admin
  const isAdmin = conversation.participants.some(
    (p) => p.user_id === currentUserId && p.role === "admin"
  );

  // Search for users to add
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !isAdmin) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", currentUserId)
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(10);

        // Filter out already added members
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
    if (!groupName.trim()) {
      toast.error("Nome do grupo não pode ser vazio");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ name: groupName.trim() })
        .eq("id", conversation.id);

      if (error) throw error;

      toast.success("Nome do grupo atualizado!");
      onGroupUpdated?.();
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Erro ao atualizar nome do grupo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("conversation_participants")
        .insert({
          conversation_id: conversation.id,
          user_id: userId,
          role: "member",
        });

      if (error) throw error;

      toast.success("Membro adicionado ao grupo!");
      setSearchQuery("");
      setSearchResults([]);
      onGroupUpdated?.();
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Erro ao adicionar membro");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === currentUserId) {
      // Allow user to leave the group
      try {
        const { error } = await supabase
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", conversation.id)
          .eq("user_id", currentUserId);

        if (error) throw error;

        toast.success("Você deixou o grupo");
        onOpenChange(false);
        onGroupUpdated?.();
      } catch (error) {
        toast.error("Erro ao sair do grupo");
      }
      return;
    }

    if (!isAdmin) {
      toast.error("Você não tem permissão para remover membros");
      return;
    }

    try {
      const { error } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversation.id)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Membro removido do grupo");
      onGroupUpdated?.();
    } catch (error) {
      toast.error("Erro ao remover membro");
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!isAdmin) {
      toast.error("Você não tem permissão para promover membros");
      return;
    }

    try {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ role: "admin" })
        .eq("conversation_id", conversation.id)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Membro promovido a admin!");
      onGroupUpdated?.();
    } catch (error) {
      toast.error("Erro ao promover membro");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações do Grupo</DialogTitle>
          <DialogDescription>
            Gerencie membros e configurações do grupo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Name */}
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

          {/* Add Members Section */}
          {isAdmin && (
            <div className="space-y-2">
              <Label>Adicionar Membros</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="space-y-1">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
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

          {/* Members List */}
          <div className="space-y-2">
            <Label>Membros ({conversation.participants.length})</Label>
            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-1">
                {conversation.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage
                          src={participant.profile?.avatar_url || undefined}
                        />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {participant.profile?.name
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {participant.profile?.name}
                          </p>
                          {participant.role === "admin" && (
                            <Shield className="h-3 w-3 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
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
                            onClick={() =>
                              handlePromoteToAdmin(participant.user_id)
                            }
                            title="Promover a admin"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleRemoveMember(participant.user_id)
                          }
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
