import { useRef } from "react";

type SoundName = "move" | "capture" | "notify";

const SRC: Record<SoundName, string> = {
  move:    "/move-self.mp3",
  capture: "/capture.mp3",
  notify:  "/notify.mp3",
};

export function useGameSounds() {
  const cache = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});

  function play(name: SoundName) {
    if (!cache.current[name]) {
      cache.current[name] = new Audio(SRC[name]);
    }
    const audio = cache.current[name]!;
    audio.currentTime = 0;
    audio.play().catch(() => {}); // silently ignore autoplay policy blocks
  }

  return { play };
}
