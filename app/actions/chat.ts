"use server";

import { createClient } from "@/lib/supabase/server";

export async function createPrivateConversation(otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  try {
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        type: "private",
        created_by: user.id,
      })
      .select()
      .single();

    if (convError || !conversation) {
      throw new Error(convError?.message || "Erro ao criar conversa");
    }

    const { error: partError } = await supabase
      .from("conversation_participants")
      .insert([
        {
          conversation_id: conversation.id,
          user_id: user.id,
          role: "admin",
        },
        {
          conversation_id: conversation.id,
          user_id: otherUserId,
          role: "member",
        },
      ]);

    if (partError) {
      throw new Error(partError.message || "Erro ao adicionar participantes");
    }

    return { conversationId: conversation.id };
  } catch (error) {
    console.error("[v0] Error creating private conversation:", error);
    throw error;
  }
}

export async function createGroupConversation(
  groupName: string,
  memberIds: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  if (memberIds.length < 2) {
    throw new Error("Selecione pelo menos 2 membros");
  }

  try {
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        type: "group",
        name: groupName,
        created_by: user.id,
      })
      .select()
      .single();

    if (convError || !conversation) {
      throw new Error(convError?.message || "Erro ao criar grupo");
    }

    const participants = [
      {
        conversation_id: conversation.id,
        user_id: user.id,
        role: "admin",
      },
      ...memberIds.map((memberId) => ({
        conversation_id: conversation.id,
        user_id: memberId,
        role: "member",
      })),
    ];

    const { error: partError } = await supabase
      .from("conversation_participants")
      .insert(participants);

    if (partError) {
      throw new Error(partError.message || "Erro ao adicionar participantes");
    }

    return { conversationId: conversation.id };
  } catch (error) {
    console.error("[v0] Error creating group conversation:", error);
    throw error;
  }
}

export async function updatePresence(isOnline: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("[v0] Error updating presence:", error);
    throw error;
  }
}