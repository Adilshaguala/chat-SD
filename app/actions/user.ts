"use server";

import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return profile || null;
  } catch (error) {
    console.error("[v0] Error fetching current user:", error);
    return null;
  }
}

export async function updateUserPresence(isOnline: boolean) {
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

export async function searchUsers(query: string): Promise<Profile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  if (!query.trim() || query.length < 2) return [];

  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);

    return profiles || [];
  } catch (error) {
    console.error("[v0] Error searching users:", error);
    return [];
  }
}
