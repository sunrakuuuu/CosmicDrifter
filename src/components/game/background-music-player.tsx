
'use client';

import { useAudio } from "@/hooks/use-audio";
import { useEffect, useRef } from "react";

export function BackgroundMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isMuted, hasInteracted } = useAudio();

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.muted = isMuted;
      if (hasInteracted && !isMuted) {
        audioElement.play().catch(error => {
          console.log("Audio play was prevented by browser policy.", error);
        });
      } else {
        audioElement.pause();
      }
    }
  }, [isMuted, hasInteracted]);

  return <audio ref={audioRef} src="/backgroundmusic.mp3" loop />;
}
