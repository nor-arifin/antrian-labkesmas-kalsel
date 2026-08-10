import { useCallback, useRef } from 'react';

export function useAudio() {
  const queueRef = useRef([]);
  const playingRef = useRef(false);

  const playSequence = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    queueRef.current = [...files];

    if (playingRef.current) return;
    playingRef.current = true;

    while (queueRef.current.length > 0) {
      const file = queueRef.current.shift();
      try {
        await new Promise((resolve, reject) => {
          const audio = new Audio(file);
          audio.onended = resolve;
          audio.onerror = () => reject(new Error(`Failed to load ${file}`));
          audio.play().catch(reject);
        });
      } catch (err) {
        console.error('Audio playback error:', err);
      }
    }

    playingRef.current = false;
  }, []);

  const playAlert = useCallback(() => {
    playSequence(['/audio/alert.mp3']);
  }, [playSequence]);

  return { playSequence, playAlert };
}
