import { useEffect, useMemo, useState } from "react";
import { type BibleVerse } from "../lib/bibleApi";
import { buildBibleSpeechBlocks, getVoiceLabel, useBibleSpeech, useSpeechVoices } from "../lib/speech";
import { useAppState } from "../state/AppState";

export function BibleAudioControls({
  reference,
  verses,
  loading,
  onVerseChange,
}: {
  reference: string;
  verses: BibleVerse[] | null;
  loading: boolean;
  onVerseChange?: (verse: number | null) => void;
}) {
  const { settings } = useAppState();
  const [collapsed, setCollapsed] = useState(false);
  const { voices, ready } = useSpeechVoices();
  const { status, speak, pause, resume, stop, supported } = useBibleSpeech();

  const blocks = useMemo(() => (verses ? buildBibleSpeechBlocks(reference, verses) : []), [reference, verses]);
  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voiceURI === settings.bibleVoiceURI) ?? null,
    [voices, settings.bibleVoiceURI],
  );

  useEffect(() => {
    stop();
    onVerseChange?.(null);
  }, [reference, verses, stop]);

  const canSpeak = supported && !loading && blocks.length > 0;
  const handlePlay = () => {
    if (status === "paused") {
      resume();
      return;
    }
    speak(blocks, {
      voiceURI: settings.bibleVoiceURI,
      rate: settings.bibleSpeechRate,
      pitch: settings.bibleSpeechPitch,
      onVerseStart: onVerseChange,
    });
  };

  if (collapsed) {
    return (
      <button
        className="audio-mini-chip"
        onClick={() => setCollapsed(false)}
        aria-label="Show audio controls"
      >
        <span>Audio Bible</span>
        <span className="audio-mini-chip__status">
          {status === "speaking" ? "Playing" : status === "paused" ? "Paused" : "Ready"}
        </span>
      </button>
    );
  }

  return (
    <div className="card audio-card">
      <div className="audio-card__header">
        <div>
          <div style={{ fontWeight: 700, color: "var(--text-h)" }}>Audio Bible</div>
          <div className="small muted">
            {supported
              ? ready
                ? `Voice: ${getVoiceLabel(selectedVoice)} · ${settings.bibleSpeechRate.toFixed(2)}x · pitch ${settings.bibleSpeechPitch.toFixed(2)}`
                : "Loading browser voices..."
              : "Audio playback is not supported in this browser."}
          </div>
        </div>
        <div className="audio-card__buttons">
          <button className="btn btn-secondary" onClick={() => setCollapsed(true)}>
            Hide player
          </button>
          <button className="btn btn-secondary" onClick={handlePlay} disabled={!canSpeak || status === "speaking"}>
            {status === "paused" ? "Resume" : "Play"}
          </button>
          <button className="btn btn-secondary" onClick={pause} disabled={status !== "speaking"}>
            Pause
          </button>
          <button className="btn btn-secondary" onClick={stop} disabled={status === "idle"}>
            Stop
          </button>
        </div>
      </div>
      {!loading && blocks.length === 0 && (
        <p className="small muted" style={{ margin: "10px 0 0" }}>
          This chapter is empty.
        </p>
      )}
    </div>
  );
}