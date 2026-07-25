import { useEffect, useMemo, useState } from "react";
import { type BibleVerse } from "../lib/bibleApi";
import { buildBibleSpeechBlocks, getBestAvailableVoice, getVoiceLabel, sortVoicesByNaturalness, useBibleSpeech, useSpeechVoices } from "../lib/speech";
import { useAppState } from "../state/AppState";

export function BibleAudioControls({
  reference,
  verses,
  loading,
  onVerseChange,
  jumpToVerse,
  onJumpHandled,
  onPlaybackComplete,
  onPlaybackControl,
  autoPlaySignal,
}: {
  reference: string;
  verses: BibleVerse[] | null;
  loading: boolean;
  onVerseChange?: (verse: number | null) => void;
  jumpToVerse?: number | null;
  onJumpHandled?: () => void;
  onPlaybackComplete?: () => void;
  onPlaybackControl?: (action: "play" | "pause" | "stop") => void;
  autoPlaySignal?: number;
}) {
  const { settings, updateSettings } = useAppState();
  const [collapsed, setCollapsed] = useState(false);
  const [showTuning, setShowTuning] = useState(false);
  const { voices, ready } = useSpeechVoices();
  const { status, speak, pause, resume, stop, supported } = useBibleSpeech();

  const blocks = useMemo(() => (verses ? buildBibleSpeechBlocks(reference, verses) : []), [reference, verses]);
  const sortedVoices = useMemo(() => sortVoicesByNaturalness(voices, settings.translation), [voices, settings.translation]);
  const selectedVoice = useMemo(
    () => sortedVoices.find((voice) => voice.voiceURI === settings.bibleVoiceURI) ?? null,
    [sortedVoices, settings.bibleVoiceURI],
  );
  const recommendedVoice = useMemo(() => getBestAvailableVoice(sortedVoices, settings.translation), [sortedVoices, settings.translation]);

  useEffect(() => {
    stop();
    onVerseChange?.(null);
  }, [reference, verses, stop]);

  useEffect(() => {
    if (jumpToVerse === null || jumpToVerse === undefined) return;
    if (status !== "speaking" && status !== "paused") {
      onJumpHandled?.();
      return;
    }
    const startIndex = blocks.findIndex((block) => block.verse === jumpToVerse);
    if (startIndex < 0) {
      onJumpHandled?.();
      return;
    }
    speak(blocks.slice(startIndex), {
      voiceURI: settings.bibleVoiceURI,
      rate: settings.bibleSpeechRate,
      pitch: settings.bibleSpeechPitch,
      onVerseStart: onVerseChange,
      onComplete: onPlaybackComplete,
    });
    onJumpHandled?.();
  }, [
    blocks,
    jumpToVerse,
    onJumpHandled,
    onPlaybackComplete,
    onVerseChange,
    settings.bibleSpeechPitch,
    settings.bibleSpeechRate,
    settings.bibleVoiceURI,
    speak,
    status,
  ]);

  const canSpeak = supported && !loading && blocks.length > 0;
  const handlePlay = () => {
    if (status === "paused") {
      resume();
      onPlaybackControl?.("play");
      return;
    }
    speak(blocks, {
      voiceURI: settings.bibleVoiceURI,
      rate: settings.bibleSpeechRate,
      pitch: settings.bibleSpeechPitch,
      onVerseStart: onVerseChange,
      onComplete: onPlaybackComplete,
    });
    onPlaybackControl?.("play");
  };

  useEffect(() => {
    if (autoPlaySignal === undefined) return;
    if (!canSpeak || status === "speaking") return;
    handlePlay();
  }, [autoPlaySignal, canSpeak, status]);

  if (collapsed) {
    const statusLabel = status === "speaking" ? "Playing" : status === "paused" ? "Paused" : "Ready";
    return (
      <button
        className="audio-mini-chip"
        onClick={() => setCollapsed(false)}
        aria-label="Show audio controls"
        title={`Audio Bible: ${statusLabel}`}
      >
        <span className="audio-mini-chip__label">Audio</span>
        <span className={`audio-mini-chip__status audio-mini-chip__status--${status}`}>{statusLabel}</span>
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
          {recommendedVoice && recommendedVoice.voiceURI !== settings.bibleVoiceURI && (
            <button
              className="btn btn-secondary"
              onClick={() => updateSettings({ bibleVoiceURI: recommendedVoice.voiceURI })}
              disabled={!supported || !ready}
            >
              Try recommended
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowTuning((value) => !value)}>
            {showTuning ? "Hide tuning" : "Tuning"}
          </button>
          <button className="btn btn-secondary" onClick={handlePlay} disabled={!canSpeak || status === "speaking"}>
            {status === "paused" ? "Resume" : "Play"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              pause();
              onPlaybackControl?.("pause");
            }}
            disabled={status !== "speaking"}
          >
            Pause
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              stop();
              onPlaybackControl?.("stop");
            }}
            disabled={status === "idle"}
          >
            Stop
          </button>
        </div>
      </div>
      {supported && ready && sortedVoices.length > 0 && (
        <div className="setting-row" style={{ paddingTop: 0 }}>
          <label htmlFor="player-voice-select">Voice</label>
          <div className="audio-voice-picker">
            <select
              id="player-voice-select"
              className="settings-voice-select"
              value={settings.bibleVoiceURI}
              onChange={(e) => updateSettings({ bibleVoiceURI: e.target.value })}
            >
              <option value="">Browser default</option>
              {sortedVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang}){voice.localService ? " · local" : ""}
                </option>
              ))}
            </select>
            {recommendedVoice && recommendedVoice.voiceURI !== settings.bibleVoiceURI && (
              <button
                className="btn btn-secondary"
                onClick={() => updateSettings({ bibleVoiceURI: recommendedVoice.voiceURI })}
              >
                Try recommended
              </button>
            )}
          </div>
        </div>
      )}
      {showTuning && (
        <div className="audio-card__tuning">
          <div className="setting-row" style={{ padding: 0, borderTop: 0 }}>
            <label htmlFor="player-speech-rate">Rate</label>
            <div className="setting-control">
              <input
                id="player-speech-rate"
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={settings.bibleSpeechRate}
                onChange={(e) => updateSettings({ bibleSpeechRate: Number(e.target.value) })}
              />
              <span className="range-value">{settings.bibleSpeechRate.toFixed(2)}x</span>
            </div>
          </div>
          <div className="setting-row" style={{ padding: 0, borderTop: 0 }}>
            <label htmlFor="player-speech-pitch">Pitch</label>
            <div className="setting-control">
              <input
                id="player-speech-pitch"
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={settings.bibleSpeechPitch}
                onChange={(e) => updateSettings({ bibleSpeechPitch: Number(e.target.value) })}
              />
              <span className="range-value">{settings.bibleSpeechPitch.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      {!loading && blocks.length === 0 && (
        <p className="small muted" style={{ margin: "10px 0 0" }}>
          This chapter is empty.
        </p>
      )}
    </div>
  );
}