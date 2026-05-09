"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  name: string,
  avatarUrl: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("[v0] Error updating profile:", error);
    throw error;
  }
}

export async function uploadAvatar(
  formData: FormData
): Promise<{ url: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  const file = formData.get("file") as File;
  if (!file) throw new Error("Nenhum arquivo fornecido");

  try {
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}.${fileExt}`;

    // Delete old avatar if exists
    const { data: listData } = await supabase.storage
      .from("avatars")
      .list(user.id);

    if (listData && listData.length > 0) {
      await supabase.storage
        .from("avatars")
        .remove(listData.map((f) => `${user.id}/${f.name}`));
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return { url: data.publicUrl };
  } catch (error) {
    console.error("[v0] Error uploading avatar:", error);
    throw error;
  }
}
