import { useState, useRef, useCallback } from "react";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Update duration every second
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(
    (): Promise<Blob | null> => {
      return new Promise((resolve) => {
        if (!mediaRecorderRef.current || !isRecording) {
          resolve(null);
          return;
        }

        const mediaRecorder = mediaRecorderRef.current;

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunksRef.current, {
            type: mediaRecorder.mimeType,
          });
          resolve(audioBlob);
        };

        mediaRecorder.stop();

        // Stop the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        setIsRecording(false);
        setDuration(0);
      });
    },
    [isRecording]
  );

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      chunksRef.current = [];
      setIsRecording(false);
      setDuration(0);
    }
  }, [isRecording]);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
