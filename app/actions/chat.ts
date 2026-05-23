"use server";

import { createClient } from "@/lib/supabase/server";
import { headers, cookies } from "next/headers";

export async function createPrivateConversation(otherUserId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Não autenticado - faça login primeiro");
    }

    // Create new private conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        type: "private",
        created_by: user.id,
      })
      .select()
      .single();

    if (convError || !conversation) {
      console.error("[v0] Conversation creation error:", convError);
      throw new Error(convError?.message || "Erro ao criar conversa");
    }

    // Add participants
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
      console.error("[v0] Participant creation error:", partError);
      throw new Error(partError.message || "Erro ao adicionar participantes");
    }

    return { conversationId: conversation.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[v0] Error creating private conversation:", message);
    throw new Error(message);
  }
}

export async function createGroupConversation(
  groupName: string,
  memberIds: string[]
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Não autenticado - faça login primeiro");
    }

    if (memberIds.length < 2) {
      throw new Error("Selecione pelo menos 2 membros");
    }

    // Create group conversation
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
      console.error("[v0] Group creation error:", convError);
      throw new Error(convError?.message || "Erro ao criar grupo");
    }

    // Add all participants including current user
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
      console.error("[v0] Group participants error:", partError);
      throw new Error(partError.message || "Erro ao adicionar participantes");
    }

    return { conversationId: conversation.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[v0] Error creating group conversation:", message);
    throw new Error(message);
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
