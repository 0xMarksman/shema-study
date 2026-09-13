import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KokoroTTS } from "kokoro-js";
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

export interface KokoroVoice {
  id: string;
  name: string;
  gender: "Male" | "Female";
  language: string;
}

export const KOKORO_VOICES: KokoroVoice[] = [
  { id: "af_heart", name: "Heart", gender: "Female", language: "American English" },
  { id: "af_bella", name: "Bella", gender: "Female", language: "American English" },
  { id: "af_sarah", name: "Sarah", gender: "Female", language: "American English" },
  { id: "af_nicole", name: "Nicole", gender: "Female", language: "American English" },
  { id: "am_michael", name: "Michael", gender: "Male", language: "American English" },
  { id: "am_fenrir", name: "Fenrir", gender: "Male", language: "American English" },
  { id: "am_puck", name: "Puck", gender: "Male", language: "American English" },
  { id: "bm_george", name: "George", gender: "Male", language: "British English" },
  { id: "bf_emma", name: "Emma", gender: "Female", language: "British English" },
];

const KOKORO_PREFIX = "kokoro:";
let kokoroPromise: Promise<KokoroTTS> | null = null;

function isKokoroVoice(voiceURI: string): boolean {
  return voiceURI.startsWith(KOKORO_PREFIX);
}

async function loadKokoro(): Promise<KokoroTTS> {
  if (!kokoroPromise) {
    kokoroPromise = import("kokoro-js").then(({ KokoroTTS: TTS }) =>
      TTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
        dtype: "q8",
      }),
    );
  }
  return kokoroPromise;
}

export interface SpeakOptions extends BibleSpeechSettings {
  onVerseStart?: (verse: number | null) => void;
  onComplete?: () => void;
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
    ...verses.map((verse) => ({ text: verse.text, verse: verse.verse })),
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const clearAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    runId.current += 1;
    clearAudio();
    if (supportsBrowserSpeech()) window.speechSynthesis.cancel();
    setStatus("idle");
  }, [clearAudio]);

  useEffect(() => stop, [stop]);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setStatus("paused");
      return;
    }
    if (!supportsBrowserSpeech()) return;
    const synth = window.speechSynthesis;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setStatus("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current?.src && audioRef.current.paused) {
      void audioRef.current.play().then(() => setStatus("speaking")).catch(() => setStatus("idle"));
      return;
    }
    if (!supportsBrowserSpeech()) return;
    const synth = window.speechSynthesis;
    if (synth.paused) {
      synth.resume();
      setStatus("speaking");
    }
  }, []);

  const speak = useCallback((blocks: SpeechBlock[], options: SpeakOptions) => {
    if (blocks.length === 0 || typeof window === "undefined") return false;

    stop();
    const localRun = ++runId.current;

    if (isKokoroVoice(options.voiceURI)) {
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      setStatus("speaking");
      void (async () => {
        try {
          const tts = await loadKokoro();
          const voice = (options.voiceURI.slice(KOKORO_PREFIX.length) || "af_heart") as NonNullable<Parameters<KokoroTTS["generate"]>[1]>["voice"];
          for (const block of blocks) {
            if (runId.current !== localRun) return;
            options.onVerseStart?.(block.verse ?? null);
            const generated = await tts.generate(block.text, { voice, speed: options.rate });
            if (runId.current !== localRun) return;
            const url = URL.createObjectURL(generated.toBlob());
            objectUrlRef.current = url;
            audio.src = url;
            await new Promise<void>((resolve, reject) => {
              audio.onended = () => resolve();
              audio.onerror = () => reject(new Error("Kokoro audio playback failed"));
              void audio.play().catch(reject);
            });
            URL.revokeObjectURL(url);
            objectUrlRef.current = null;
          }
          if (runId.current === localRun) {
            setStatus("idle");
            options.onComplete?.();
            options.onVerseStart?.(null);
          }
        } catch {
          if (runId.current !== localRun) return;
          clearAudio();
          speakWithBrowserSpeech(blocks, options, localRun);
        }
      })();
      return true;
    }

    if (!supportsBrowserSpeech()) return false;
    speakWithBrowserSpeech(blocks, options, localRun);
    return true;
  }, [clearAudio, stop]);

  const speakWithBrowserSpeech = useCallback((blocks: SpeechBlock[], options: SpeakOptions, localRun: number) => {
    if (!supportsBrowserSpeech()) return;

    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const selectedVoice = options.voiceURI
      ? voices.find((voice) => voice.voiceURI === options.voiceURI) ?? null
      : null;

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
        if (index === blocks.length - 1) {
          setStatus("idle");
          options.onComplete?.();
        }
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
  }, []);

  return {
    status,
    speak,
    pause,
    resume,
    stop,
    supported: typeof window !== "undefined",
  };
}

export function getVoiceLabel(voice: SpeechSynthesisVoice | null) {
  if (!voice) return "Browser default";
  return `${voice.name} (${voice.lang})`;
}

function getVoiceQualityScore(voice: SpeechSynthesisVoice, preferredLang?: string) {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  let score = 0;

  if (preferredLang && voice.lang.toLowerCase().startsWith(preferredLang.toLowerCase())) {
    score += 30;
  }
  if (voice.localService) score += 12;
  if (voice.default) score += 8;
  if (name.includes("natural") || name.includes("neural") || name.includes("enhanced")) score += 25;
  if (name.includes("google") || name.includes("microsoft") || name.includes("apple")) score += 14;
  if (name.includes("samantha") || name.includes("victoria") || name.includes("daniel") || name.includes("alex")) score += 18;
  if (name.includes("tessa") || name.includes("ava") || name.includes("aria") || name.includes("narrator")) score += 10;
  if (name.includes("espeak") || name.includes("festival") || name.includes("default")) score -= 12;

  return score;
}

export function sortVoicesByNaturalness(voices: SpeechSynthesisVoice[], preferredLang?: string) {
  return [...voices].sort((left, right) => {
    const scoreDelta = getVoiceQualityScore(right, preferredLang) - getVoiceQualityScore(left, preferredLang);
    if (scoreDelta !== 0) return scoreDelta;
    const langDelta = left.lang.localeCompare(right.lang);
    if (langDelta !== 0) return langDelta;
    return left.name.localeCompare(right.name);
  });
}

export function getBestAvailableVoice(voices: SpeechSynthesisVoice[], preferredLang?: string) {
  return sortVoicesByNaturalness(voices, preferredLang)[0] ?? null;
}