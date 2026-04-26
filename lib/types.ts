export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  type: "private" | "group";
  name: string | null;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  last_read_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: "text" | "image" | "video" | "audio" | "file" | "deleted";
  reply_to_id: string | null;
  thread_id: string | null;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  mime_type: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  created_at: string;
}

export interface MessageStatus {
  id: string;
  message_id: string;
  user_id: string;
  status: "sent" | "delivered" | "read";
  updated_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// Extended types with relations
export interface MessageWithDetails extends Message {
  sender: Profile;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  status: MessageStatus[];
  reply_to?: Message & { sender: Profile };
}

export interface ConversationWithDetails extends Conversation {
  participants: (ConversationParticipant & { profile: Profile })[];
  last_message?: MessageWithDetails;
  unread_count: number;
}

// UI State types
export interface ChatState {
  selectedConversationId: string | null;
  searchQuery: string;
  isNewChatOpen: boolean;
  isMobileMenuOpen: boolean;
}
