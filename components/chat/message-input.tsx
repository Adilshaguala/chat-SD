"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { MessageWithDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AudioRecorder } from "./audio-recorder";
import { cn } from "@/lib/utils";
import {
  Smile,
  Paperclip,
  Send,
  X,
  Image as ImageIcon,
  FileText,
  Video,
} from "lucide-react";

interface MessageInputProps {
  onSendMessage: (
    content: string,
    type: "text" | "image" | "video" | "audio" | "file",
    attachments?: File[]
  ) => Promise<void>;
  replyingTo: MessageWithDetails | null;
  onCancelReply: () => void;
}

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊",
  "😇", "🙂", "😉", "😍", "🥰", "😘", "😗", "😋",
  "😛", "😜", "😝", "🤑", "🤗", "🤔", "🤭", "🤫",
  "🤐", "😏", "😒", "😞", "😔", "😟", "😕", "🙁",
  "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭",
  "😤", "😠", "😡", "🤬", "👍", "👎", "👊", "✊",
  "🤛", "🤜", "🤝", "👏", "🙌", "👐", "🤲", "🤞",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
];

export function MessageInput({
  onSendMessage,
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (
      (!message.trim() && selectedFiles.length === 0 && !audioBlob) ||
      isLoading
    )
      return;

    setIsLoading(true);

    try {
      if (audioBlob) {
        // Convert blob to File
        const audioFile = new File([audioBlob], "audio.webm", {
          type: audioBlob.type,
        });
        await onSendMessage(message, "audio", [audioFile]);
        setAudioBlob(null);
      } else if (selectedFiles.length > 0) {
        // Determine type based on first file
        const firstFile = selectedFiles[0];
        let type: "image" | "video" | "audio" | "file" = "file";

        if (firstFile.type.startsWith("image/")) type = "image";
        else if (firstFile.type.startsWith("video/")) type = "video";
        else if (firstFile.type.startsWith("audio/")) type = "audio";

        await onSendMessage(message, type, selectedFiles);
        setSelectedFiles([]);
      } else {
        await onSendMessage(message.trim(), "text");
      }

      setMessage("");
      textareaRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioRecorded = (blob: Blob) => {
    setAudioBlob(blob);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center justify-between mb-2 px-3 py-2 bg-muted rounded-lg">
          <div className="min-w-0">
            <span className="text-xs text-primary font-medium">
              Respondendo a {replyingTo.sender?.name}
            </span>
            <p className="text-sm text-muted-foreground truncate">
              {replyingTo.content || "Mídia"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Audio preview */}
      {audioBlob && (
        <div className="flex gap-2 mb-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-primary">🎙️</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Áudio gravado</p>
            </div>
            <button
              onClick={() => setAudioBlob(null)}
              className="h-5 w-5 rounded-full bg-black/50 flex items-center justify-center flex-shrink-0"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 h-20 w-20 rounded-lg overflow-hidden bg-muted"
            >
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
              ) : file.type.startsWith("video/") ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 flex items-end gap-2 px-3 py-2 bg-muted rounded-2xl">
          {/* Emoji picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" side="top" align="start">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Message input */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className="flex-1 min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm"
            rows={1}
          />

          {/* Attachment button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" side="top" align="end">
              <div className="space-y-1">
                <button
                  onClick={() => {
                    fileInputRef.current?.setAttribute("accept", "image/*");
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Imagens
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.setAttribute("accept", "video/*");
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <Video className="h-4 w-4 text-blue-500" />
                  Vídeos
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.setAttribute("accept", "*/*");
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <FileText className="h-4 w-4 text-orange-500" />
                  Arquivos
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Mic button / Audio Recorder */}
          <AudioRecorder onAudioRecorded={handleAudioRecorded} />
        </div>

        {/* Send button */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!message.trim() && selectedFiles.length === 0) || isLoading}
          className="h-10 w-10 rounded-full flex-shrink-0"
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">Enviar</span>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
