
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AudioContextType {
  isMuted: boolean;
  hasInteracted: boolean;
  toggleMute: () => void;
  handleInteraction: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const mutedPreference = localStorage.getItem('cosmic-drifter-muted');
    if (mutedPreference) {
      setIsMuted(JSON.parse(mutedPreference));
    } else {
      setIsMuted(true); // Default to muted
    }
  }, []);

  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  }, [hasInteracted]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    localStorage.setItem('cosmic-drifter-muted', JSON.stringify(newMutedState));
  }, [isMuted]);

  return (
    <AudioContext.Provider value={{ isMuted, hasInteracted, toggleMute, handleInteraction }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
