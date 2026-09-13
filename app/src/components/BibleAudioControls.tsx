import { useEffect, useMemo, useRef, useState } from "react";
import { type BibleVerse } from "../lib/bibleApi";
import { buildBibleSpeechBlocks, KOKORO_VOICES, useBibleSpeech } from "../lib/speech";
import { CloseIcon, GearIcon, PauseIcon, PlayIcon } from "./icons";
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
  pauseSignal,
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
  pauseSignal?: number;
}) {
  const { settings, updateSettings } = useAppState();
  const [collapsed, setCollapsed] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const pendingAutoPlaySignal = useRef<number | undefined>(undefined);
  const { status, speak, pause, resume, stop, supported } = useBibleSpeech();

  const blocks = useMemo(() => (verses ? buildBibleSpeechBlocks(reference, verses) : []), [reference, verses]);
  const selectedVoice = KOKORO_VOICES.find((voice) => `kokoro:${voice.id}` === settings.bibleVoiceURI) ?? KOKORO_VOICES[0];

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
    onPlaybackControl?.("play");
    onJumpHandled?.();
  }, [
    blocks,
    jumpToVerse,
    onPlaybackControl,
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
    pendingAutoPlaySignal.current = autoPlaySignal;
  }, [autoPlaySignal]);

  useEffect(() => {
    if (pendingAutoPlaySignal.current === undefined) return;
    if (!canSpeak || status === "speaking") return;
    handlePlay();
    pendingAutoPlaySignal.current = undefined;
  }, [canSpeak, status]);

  useEffect(() => {
    if (pauseSignal === undefined) return;
    if (status !== "speaking") return;
    pause();
    onPlaybackControl?.("pause");
  }, [onPlaybackControl, pause, pauseSignal, status]);

  const statusLabel = status === "speaking" ? "Playing" : status === "paused" ? "Paused" : "Ready";
  const canTogglePlayback = canSpeak || status === "paused" || status === "speaking";

  const handleTogglePlayback = () => {
    if (status === "speaking") {
      pause();
      onPlaybackControl?.("pause");
      return;
    }
    handlePlay();
  };

  if (collapsed) {
    return (
      <div className="audio-mini-dock" role="group" aria-label="Compact audio controls">
        <button
          className="audio-mini-dock__play"
          onClick={handleTogglePlayback}
          disabled={!canTogglePlayback}
          aria-label={status === "speaking" ? "Pause audio" : "Play audio"}
          title={`Audio Bible: ${statusLabel}`}
        >
          {status === "speaking" ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          className="audio-mini-dock__settings"
          onClick={() => setCollapsed(false)}
          aria-label="Show audio settings"
          title="Audio settings"
        >
          <GearIcon />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="audio-dock" role="group" aria-label="Audio Bible controls">
        <button
          className="audio-dock__btn audio-dock__btn--primary"
          onClick={handleTogglePlayback}
          disabled={!canTogglePlayback}
          aria-label={status === "speaking" ? "Pause audio" : status === "paused" ? "Resume audio" : "Play audio"}
          title={status === "speaking" ? "Pause" : status === "paused" ? "Resume" : "Play"}
        >
          {status === "speaking" ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="audio-dock__meta">
          <span className={`audio-dock__status audio-dock__status--${status}`}>{statusLabel}</span>
          <span className="audio-dock__detail">{selectedVoice.name} · {selectedVoice.gender}</span>
        </div>

        <div className="audio-dock__actions">
          <button
            className="audio-dock__btn"
            onClick={() => setShowPanel((value) => !value)}
            aria-label={showPanel ? "Hide audio options" : "Show audio options"}
            title={showPanel ? "Hide options" : "Options"}
          >
            <GearIcon />
          </button>
          <button
            className="audio-dock__btn"
            onClick={() => setCollapsed(true)}
            aria-label="Minimize audio controls"
            title="Minimize"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {showPanel && (
        <div className="sheet-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setShowPanel(false); }}>
          <div className="sheet audio-panel-sheet" role="dialog" aria-modal="true" aria-label="Audio settings" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 style={{ margin: "0 0 10px" }}>Audio Settings</h3>

            <div className="small muted" style={{ marginBottom: 8 }}>
              {supported
                ? `Kokoro voice: ${selectedVoice.name} (${selectedVoice.gender}) · ${settings.bibleSpeechRate.toFixed(2)}x`
                : "Audio playback is not supported in this browser."}
            </div>

            {supported && (
              <div className="setting-row" style={{ paddingTop: 0 }}>
                <label htmlFor="player-voice-select">Kokoro voice</label>
                <div className="audio-voice-picker">
                  <select
                    id="player-voice-select"
                    className="settings-voice-select"
                    value={settings.bibleVoiceURI}
                    onChange={(e) => updateSettings({ bibleVoiceURI: e.target.value })}
                  >
                    {KOKORO_VOICES.map((voice) => (
                      <option key={voice.id} value={`kokoro:${voice.id}`}>
                        {voice.name} · {voice.gender} · {voice.language}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="audio-card__tuning">
              <div className="setting-row" style={{ padding: 0, borderTop: 0 }}>
                <label id="player-autoscroll-toggle-label">Auto-scroll verses</label>
                <button
                  className={`toggle ${settings.bibleAutoScroll ? "on" : ""}`}
                  onClick={() => updateSettings({ bibleAutoScroll: !settings.bibleAutoScroll })}
                  aria-checked={settings.bibleAutoScroll}
                  role="switch"
                  aria-labelledby="player-autoscroll-toggle-label"
                />
              </div>
              <div className="setting-row" style={{ padding: 0, borderTop: 0 }}>
                <label id="player-autoadvance-toggle-label">Auto chapter progression</label>
                <button
                  className={`toggle ${settings.bibleAutoAdvance ? "on" : ""}`}
                  onClick={() => updateSettings({ bibleAutoAdvance: !settings.bibleAutoAdvance })}
                  aria-checked={settings.bibleAutoAdvance}
                  role="switch"
                  aria-labelledby="player-autoadvance-toggle-label"
                />
              </div>
              <div className="setting-row" style={{ padding: 0, borderTop: 0 }}>
                <label htmlFor="player-autoscroll-resume">Resume auto-scroll</label>
                <div className="setting-control">
                  <input
                    id="player-autoscroll-resume"
                    type="range"
                    min="600"
                    max="3500"
                    step="100"
                    value={settings.bibleAutoScrollResumeMs}
                    onChange={(e) => updateSettings({ bibleAutoScrollResumeMs: Number(e.target.value) })}
                  />
                  <span className="range-value">{(settings.bibleAutoScrollResumeMs / 1000).toFixed(1)}s</span>
                </div>
              </div>
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

            {!loading && blocks.length === 0 && (
              <p className="small muted" style={{ margin: "10px 0 0" }}>
                This chapter is empty.
              </p>
            )}

            <div className="audio-card__buttons" style={{ marginTop: 10 }}>
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
              <button className="btn btn-secondary" onClick={() => setShowPanel(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}