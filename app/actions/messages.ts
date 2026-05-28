"use server";

import { createClient } from "@/lib/supabase/server";

export async function deleteMessage(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado");
  }

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .select("id, sender_id")
    .eq("id", messageId)
    .single();

  if (messageError || !message) {
    throw new Error("Mensagem não encontrada");
  }

  if (message.sender_id !== user.id) {
    throw new Error("Sem permissão para apagar esta mensagem");
  }

  const { error } = await supabase
    .from("messages")
    .update({ is_deleted: true, type: "deleted", content: null })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    throw new Error(error.message || "Erro ao apagar mensagem");
  }

  return { success: true };
}

