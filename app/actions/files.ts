"use server";

import { createClient } from "@/lib/supabase/server";

export async function uploadChatAttachment(
  formData: FormData,
  conversationId: string,
  messageId: string
): Promise<{ url: string; fileName: string; mimeType: string; size: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  const file = formData.get("file") as File;
  if (!file) throw new Error("Nenhum arquivo fornecido");

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${conversationId}/${messageId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    };
  } catch (error) {
    console.error("[v0] Error uploading file:", error);
    throw error;
  }
}

export async function deleteChatAttachment(filePath: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  try {
    const { error } = await supabase.storage
      .from("chat-attachments")
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error("[v0] Error deleting file:", error);
    throw error;
  }
}
