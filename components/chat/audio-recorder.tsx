"use client";

import { useState } from "react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Button } from "@/components/ui/button";
import { Mic, Square, X } from "lucide-react";

interface AudioRecorderProps {
  onAudioRecorded: (blob: Blob) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioRecorder({ onAudioRecorded }: AudioRecorderProps) {
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } =
    useAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = async () => {
    setIsProcessing(true);
    const audioBlob = await stopRecording();
    if (audioBlob) {
      onAudioRecorded(audioBlob);
    }
    setIsProcessing(false);
  };

  const handleCancelRecording = () => {
    cancelRecording();
  };

  if (!isRecording) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-red-500"
        onClick={handleStartRecording}
        title="Gravar áudio"
      >
        <Mic className="h-5 w-5" />
        <span className="sr-only">Gravar áudio</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-medium text-red-500">
          {formatDuration(duration)}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-green-600 hover:bg-green-100"
        onClick={handleStopRecording}
        disabled={isProcessing}
        title="Parar e enviar"
      >
        <Square className="h-5 w-5" />
        <span className="sr-only">Parar e enviar</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-red-600 hover:bg-red-100"
        onClick={handleCancelRecording}
        disabled={isProcessing}
        title="Cancelar gravação"
      >
        <X className="h-5 w-5" />
        <span className="sr-only">Cancelar gravação</span>
      </Button>
    </div>
  );
}
