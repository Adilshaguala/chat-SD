import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatLayout } from "@/components/chat/chat-layout";

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Profile should be auto-created by trigger, but handle edge case
    redirect("/auth/login");
  }

  return <ChatLayout currentUser={profile} />;
}
