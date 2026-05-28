"use server";

import { createClient } from "@/lib/supabase/server";

type GroupContext = {
  conversationId: string;
  currentUserId: string;
  currentUserRole: "admin" | "member";
};

async function getGroupContext(conversationId: string): Promise<GroupContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, type")
    .eq("id", conversationId)
    .single();

  if (conversationError || !conversation) {
    throw new Error("Conversa não encontrada");
  }

  if (conversation.type !== "group") {
    throw new Error("Ação válida apenas para grupos");
  }

  const { data: me, error: meError } = await supabase
    .from("conversation_participants")
    .select("user_id, role")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (meError || !me) {
    throw new Error("Sem permissão para esta conversa");
  }

  return {
    conversationId,
    currentUserId: user.id,
    currentUserRole: me.role,
  };
}

export async function renameGroup(conversationId: string, name: string) {
  const supabase = await createClient();
  const ctx = await getGroupContext(conversationId);

  if (ctx.currentUserRole !== "admin") {
    throw new Error("Apenas admins podem editar o grupo");
  }

  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("Nome do grupo não pode ser vazio");
  }

  const { error } = await supabase
    .from("conversations")
    .update({ name: cleanName })
    .eq("id", conversationId);

  if (error) {
    throw new Error(error.message || "Erro ao atualizar grupo");
  }

  return { success: true };
}

export async function addGroupMember(conversationId: string, userId: string) {
  const supabase = await createClient();
  const ctx = await getGroupContext(conversationId);

  if (ctx.currentUserRole !== "admin") {
    throw new Error("Apenas admins podem adicionar membros");
  }

  const { error } = await supabase.from("conversation_participants").insert({
    conversation_id: conversationId,
    user_id: userId,
    role: "member",
  });

  if (error) {
    throw new Error(error.message || "Erro ao adicionar membro");
  }

  return { success: true };
}

async function ensureNotRemovingLastAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  userId: string
) {
  const { data: target } = await supabase
    .from("conversation_participants")
    .select("role")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!target || target.role !== "admin") return;

  const { data: admins } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("role", "admin");

  if ((admins?.length || 0) <= 1) {
    throw new Error("O último admin não pode sair/remover sem promover outro");
  }
}

export async function removeGroupMember(
  conversationId: string,
  userId: string
) {
  const supabase = await createClient();
  const ctx = await getGroupContext(conversationId);

  const isSelf = userId === ctx.currentUserId;
  if (!isSelf && ctx.currentUserRole !== "admin") {
    throw new Error("Apenas admins podem remover outros membros");
  }

  await ensureNotRemovingLastAdmin(supabase, conversationId, userId);

  const { error } = await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Erro ao remover membro");
  }

  return { success: true };
}

export async function updateGroupMemberRole(
  conversationId: string,
  userId: string,
  role: "admin" | "member"
) {
  const supabase = await createClient();
  const ctx = await getGroupContext(conversationId);

  if (ctx.currentUserRole !== "admin") {
    throw new Error("Apenas admins podem alterar permissões");
  }

  if (userId === ctx.currentUserId && role === "member") {
    await ensureNotRemovingLastAdmin(supabase, conversationId, userId);
  }

  const { error } = await supabase
    .from("conversation_participants")
    .update({ role })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Erro ao atualizar permissões");
  }

  return { success: true };
}

