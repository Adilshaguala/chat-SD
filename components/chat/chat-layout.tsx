"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConversationWithDetails, Profile } from "@/lib/types";
import { ChatSidebar } from "./chat-sidebar";
import { ChatArea } from "./chat-area";
import { EmptyChatState } from "./empty-chat-state";
import { NewChatDialog } from "./new-chat-dialog";
import useSWR from "swr";

interface ChatLayoutProps {
  currentUser: Profile;
}

async function fetchConversations(): Promise<ConversationWithDetails[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get conversations where user is a participant
  const { data: participations } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (!participations || participations.length === 0) return [];

  const conversationIds = participations.map((p) => p.conversation_id);

  // Get conversation details with participants
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (!conversations) return [];

  // Get all participants for these conversations
  const { data: allParticipants } = await supabase
    .from("conversation_participants")
    .select("*, profile:profiles(*)")
    .in("conversation_id", conversationIds);

  // Get last message for each conversation
  const { data: lastMessages } = await supabase
    .from("messages")
    .select("*, sender:profiles(*)")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  // Get unread counts
  const { data: userParticipations } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id)
    .in("conversation_id", conversationIds);

  // Build the conversation list
  return conversations.map((conv) => {
    const participants = allParticipants?.filter(
      (p) => p.conversation_id === conv.id
    ) || [];

    const lastMessage = lastMessages?.find(
      (m) => m.conversation_id === conv.id
    );

    const userParticipation = userParticipations?.find(
      (p) => p.conversation_id === conv.id
    );

    // Count unread messages
    const unreadCount = lastMessages?.filter(
      (m) =>
        m.conversation_id === conv.id &&
        m.sender_id !== user.id &&
        userParticipation?.last_read_at &&
        new Date(m.created_at) > new Date(userParticipation.last_read_at)
    ).length || 0;

    return {
      ...conv,
      participants: participants.map((p) => ({
        ...p,
        profile: p.profile,
      })),
      last_message: lastMessage
        ? {
            ...lastMessage,
            sender: lastMessage.sender,
            attachments: [],
            reactions: [],
            status: [],
          }
        : undefined,
      unread_count: unreadCount,
    };
  });
}

export function ChatLayout({ currentUser }: ChatLayoutProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const {
    data: conversations = [],
    mutate: refreshConversations,
  } = useSWR("conversations", fetchConversations, {
    refreshInterval: 5000,
  });

  // Update online status
  useEffect(() => {
    const supabase = createClient();

    const updateOnlineStatus = async (isOnline: boolean) => {
      await supabase
        .from("profiles")
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq("id", currentUser.id);
    };

    updateOnlineStatus(true);

    const handleVisibilityChange = () => {
      updateOnlineStatus(!document.hidden);
    };

    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateOnlineStatus(false);
    };
  }, [currentUser.id]);

  // Real-time subscription for conversations
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          refreshConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          refreshConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshConversations]);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();

    // Search by conversation name (for groups)
    if (conv.name?.toLowerCase().includes(searchLower)) return true;

    // Search by participant names and emails
    return conv.participants.some(
      (p) =>
        p.profile?.name?.toLowerCase().includes(searchLower) ||
        p.profile?.email?.toLowerCase().includes(searchLower)
    );
  });

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  const handleConversationSelect = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
  }, []);

  const handleNewConversation = useCallback(
    (conversationId: string) => {
      refreshConversations();
      setSelectedConversationId(conversationId);
      setIsNewChatOpen(false);
    },
    [refreshConversations]
  );

  const handleBackToList = useCallback(() => {
    setSelectedConversationId(null);
  }, []);

  // Mobile: show either sidebar or chat area
  if (isMobileView) {
    return (
      <div className="flex h-screen w-full bg-background">
        {!selectedConversationId ? (
          <ChatSidebar
            conversations={filteredConversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleConversationSelect}
            onNewChat={() => setIsNewChatOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentUser={currentUser}
            className="w-full"
          />
        ) : selectedConversation ? (
          <ChatArea
            conversation={selectedConversation}
            currentUser={currentUser}
            onBack={handleBackToList}
            isMobile
          />
        ) : null}

        <NewChatDialog
          open={isNewChatOpen}
          onOpenChange={setIsNewChatOpen}
          currentUser={currentUser}
          onConversationCreated={handleNewConversation}
        />
      </div>
    );
  }

  // Desktop: show both sidebar and chat area
  return (
    <div className="flex h-screen w-full bg-background">
      <ChatSidebar
        conversations={filteredConversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleConversationSelect}
        onNewChat={() => setIsNewChatOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
        className="w-80 flex-shrink-0 border-r border-border"
      />

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatArea
            conversation={selectedConversation}
            currentUser={currentUser}
          />
        ) : (
          <EmptyChatState onNewChat={() => setIsNewChatOpen(true)} />
        )}
      </div>

      <NewChatDialog
        open={isNewChatOpen}
        onOpenChange={setIsNewChatOpen}
        currentUser={currentUser}
        onConversationCreated={handleNewConversation}
      />
    </div>
  );
}
