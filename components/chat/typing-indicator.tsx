"use client";

import { Profile } from "@/lib/types";

interface TypingIndicatorProps {
  typingUsers: Set<string>;
  allUsers: Map<string, Profile>;
  currentUserId: string;
}

export function TypingIndicator({
  typingUsers,
  allUsers,
  currentUserId,
}: TypingIndicatorProps) {
  // Filter out current user and get profiles
  const activeTypingProfiles = Array.from(typingUsers)
    .filter((userId) => userId !== currentUserId)
    .map((userId) => allUsers.get(userId))
    .filter((profile): profile is Profile => profile !== undefined);

  if (activeTypingProfiles.length === 0) {
    return null;
  }

  const names = activeTypingProfiles.map((p) => p.name).join(" e ");
  const isMultiple = activeTypingProfiles.length > 1;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2">
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce delay-100" />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce delay-200" />
      </div>
      <span>
        {names} {isMultiple ? "estão" : "está"} digitando...
      </span>
    </div>
  );
}
