import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BibleVerse } from "./bibleApi";

export interface BibleSpeechSettings {
  voiceURI: string;
  rate: number;
  pitch: number;
}

export interface SpeechBlock {
  text: string;
  verse?: number | null;
}

export interface SpeakOptions extends BibleSpeechSettings {
  onVerseStart?: (verse: number | null) => void;
}

export type SpeechStatus = "idle" | "speaking" | "paused";

export function supportsBrowserSpeech() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function buildBibleSpeechBlocks(reference: string, verses: BibleVerse[]) {
  return [
    { text: reference, verse: null },
    ...verses.map((verse) => ({ text: `Verse ${verse.verse}. ${verse.text}`, verse: verse.verse })),
  ];
}

export function useSpeechVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supportsBrowserSpeech()) {
      setReady(true);
      return;
    }

    const synth = window.speechSynthesis;
    const syncVoices = () => {
      setVoices(synth.getVoices());
      setReady(true);
    };

    syncVoices();
    synth.addEventListener("voiceschanged", syncVoices);
    return () => synth.removeEventListener("voiceschanged", syncVoices);
  }, []);

  const selectedVoice = useMemo(() => voices[0] ?? null, [voices]);

  return {
    voices,
    ready,
    selectedVoice,
  };
}

export function useBibleSpeech() {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const runId = useRef(0);

  const stop = useCallback(() => {
    if (!supportsBrowserSpeech()) return;
    runId.current += 1;
    window.speechSynthesis.cancel();
    setStatus("idle");
  }, []);

  useEffect(() => stop, [stop]);

  const pause = useCallback(() => {
    if (!supportsBrowserSpeech()) return;
    const synth = window.speechSynthesis;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setStatus("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (!supportsBrowserSpeech()) return;
    const synth = window.speechSynthesis;
    if (synth.paused) {
      synth.resume();
      setStatus("speaking");
    }
  }, []);

  const speak = useCallback((blocks: SpeechBlock[], options: SpeakOptions) => {
    if (!supportsBrowserSpeech() || blocks.length === 0) return false;

    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const selectedVoice = options.voiceURI
      ? voices.find((voice) => voice.voiceURI === options.voiceURI) ?? null
      : null;

    stop();
    const localRun = ++runId.current;

    const utterances = blocks.map((block, index) => {
      const utterance = new SpeechSynthesisUtterance(block.text);
      utterance.rate = options.rate;
      utterance.pitch = options.pitch;
      utterance.volume = 1;
      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onstart = () => {
        if (runId.current === localRun) setStatus("speaking");
        options.onVerseStart?.(block.verse ?? null);
      };
      utterance.onend = () => {
        if (runId.current !== localRun) return;
        if (index === blocks.length - 1) setStatus("idle");
      };
      utterance.onerror = () => {
        if (runId.current === localRun) {
          runId.current += 1;
          setStatus("idle");
          options.onVerseStart?.(null);
          synth.cancel();
        }
      };

      return utterance;
    });

    for (const utterance of utterances) {
      synth.speak(utterance);
    }

    setStatus("speaking");
    return true;
  }, [stop]);

  return {
    status,
    speak,
    pause,
    resume,
    stop,
    supported: supportsBrowserSpeech(),
  };
}

export function getVoiceLabel(voice: SpeechSynthesisVoice | null) {
  if (!voice) return "Browser default";
  return `${voice.name} (${voice.lang})`;
}