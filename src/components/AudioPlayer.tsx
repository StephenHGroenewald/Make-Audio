import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, Sparkles, Loader2 } from 'lucide-react';
import { GeneratedSpeech } from '../types/tts';
import { VOICES } from '../data/voices';

interface AudioPlayerProps {
  speech: GeneratedSpeech | null;
  isGenerating: boolean;
  onGenerate: () => void;
  activeVoiceId: string;
  textChanged: boolean;
  estimatedDuration: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  speech,
  isGenerating,
  onGenerate,
  activeVoiceId,
  textChanged,
  estimatedDuration
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Use estimated duration if no speech is generated yet or text has changed
  const duration = useMemo(() => {
    if (speech && !textChanged) {
      return speech.durationSeconds || estimatedDuration || 0;
    }
    return estimatedDuration || 0;
  }, [speech, textChanged, estimatedDuration]);

  const voiceMeta = useMemo(() => {
    const voiceId = (speech && !textChanged) ? speech.voice : activeVoiceId;
    return VOICES.find((v) => v.id === voiceId) || {
      name: voiceId,
      gender: 'Neutral',
      languageLabel: 'English'
    };
  }, [speech, activeVoiceId, textChanged]);

  // Compute waveform peaks from raw float samples or show static waveform if idle
  const waveformBars = useMemo(() => {
    const raw = (speech && !textChanged) ? speech.rawAudioData : null;
    if (!raw || raw.length === 0) {
      // Subtle sine wave pattern for visual interest on idle player
      const idleBars: number[] = [];
      for (let i = 0; i < 64; i++) {
        const val = 0.15 + 0.15 * Math.sin((i / 64) * Math.PI * 4);
        idleBars.push(val);
      }
      return idleBars;
    }

    const numBars = 64;
    const blockSize = Math.floor(raw.length / numBars);
    const bars: number[] = [];

    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(raw[start + j] || 0);
      }
      const avg = sum / blockSize;
      bars.push(Math.min(1, Math.max(0.1, avg * 4)));
    }

    const max = Math.max(...bars, 0.2);
    return bars.map((b) => Math.max(0.12, b / max));
  }, [speech, textChanged]);

  const audioSrc = (speech && !textChanged) ? speech.audioUrl : undefined;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      // Handled reactively
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || duration);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    // Auto-play when new audio is generated
    audio.play().catch(() => {
      // Browser autoplay restriction
    });

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioSrc]);

  const handleMainActionClick = () => {
    if (isGenerating) return;

    const isReadyToPlay = speech && !textChanged;
    if (!isReadyToPlay) {
      onGenerate();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (currentTime >= duration - 0.1) {
        audio.currentTime = 0;
      }
      audio.play().catch(console.error);
    }
  };

  const handleSeek = (time: number) => {
    const isReadyToPlay = speech && !textChanged;
    if (!isReadyToPlay) return;

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleWaveformClick = (index: number) => {
    const targetRatio = index / waveformBars.length;
    const targetTime = targetRatio * duration;
    handleSeek(targetTime);
  };

  const handleReplay = () => {
    const isReadyToPlay = speech && !textChanged;
    if (!isReadyToPlay) return;

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().catch(console.error);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      audio.muted = false;
      setIsMuted(false);
    }
  };

  const handleRateChange = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const playedRatio = duration > 0 ? currentTime / duration : 0;
  const currentBarIndex = Math.floor(playedRatio * waveformBars.length);

  const isReadyToPlay = speech && !textChanged;

  return (
    <div
      id="kokoro-audio-player"
      className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl p-5 shadow-lg space-y-4"
    >
      <audio ref={audioRef} src={audioSrc} preload="auto" />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-semibold text-xs border border-emerald-500/30">
            TTS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100">{voiceMeta.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
                {voiceMeta.gender}
              </span>
              <span className="text-xs text-slate-400">{voiceMeta.languageLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded border border-slate-800">
            <Sparkles className="w-3 h-3 text-amber-400" />
            24 kHz mono
          </span>
          <span className="bg-slate-800/60 px-2 py-1 rounded border border-slate-800">
            {isReadyToPlay && speech
              ? `Generated in ${speech.generationTimeMs}ms`
              : isGenerating
              ? 'Generating...'
              : 'Ready to generate'}
          </span>
          
          <a
            id="download-audio-button"
            href={isReadyToPlay && speech ? speech.audioUrl : '#'}
            download={isReadyToPlay && speech ? `kokoro-tts-${speech.voice}-${Date.now()}.wav` : undefined}
            onClick={(e) => {
              if (!isReadyToPlay) e.preventDefault();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium border ${
              isReadyToPlay
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700 cursor-pointer'
                : 'bg-slate-800/40 text-slate-500 border-slate-800/60 cursor-not-allowed select-none'
            }`}
            title={isReadyToPlay ? 'Download WAV file' : 'No generated speech yet'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download WAV</span>
          </a>
        </div>
      </div>

      {/* Control Bar Line (Now ABOVE the divider line & waveform) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Playback & Generate Buttons */}
        <div className="flex items-center gap-2">
          {/* Unified Play / Generate Button */}
          <button
            id="play-pause-audio-btn"
            type="button"
            onClick={handleMainActionClick}
            disabled={isGenerating}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95 ${
              isGenerating
                ? 'bg-slate-800 text-slate-500 ring-slate-800 cursor-not-allowed'
                : isReadyToPlay
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-emerald-400 cursor-pointer'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 ring-indigo-500 cursor-pointer animate-pulse'
            }`}
            title={
              isGenerating
                ? 'Generating speech...'
                : isReadyToPlay
                ? isPlaying
                  ? 'Pause (Space)'
                  : 'Play (Space)'
                : 'Generate Speech (Space)'
            }
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            ) : isReadyToPlay ? (
              isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          <button
            id="replay-audio-btn"
            type="button"
            onClick={handleReplay}
            disabled={!isReadyToPlay}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${
              isReadyToPlay
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 cursor-pointer active:scale-95'
                : 'bg-slate-800/30 text-slate-600 border-slate-800/40 cursor-not-allowed select-none'
            }`}
            title="Restart playback"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Playback Speed selector & Volume controller next to Play button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Playback Speed selector */}
          <div className={`flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border text-xs ${
            isReadyToPlay ? 'border-slate-800' : 'border-slate-800/40 opacity-50'
          }`}>
            <span className="text-slate-400 px-1 font-medium">Speed:</span>
            {[0.8, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                disabled={!isReadyToPlay}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  isReadyToPlay
                    ? playbackRate === rate
                      ? 'bg-slate-700 text-white shadow-sm cursor-pointer'
                      : 'text-slate-400 hover:text-slate-200 cursor-pointer'
                    : 'text-slate-600 select-none'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Volume Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              title="Volume"
            />
          </div>
        </div>
      </div>

      {/* Separator Divider Line */}
      <div className="border-t border-slate-800/70 pt-1" />

      {/* Waveform Visualization (Now BELOW the divider line) */}
      <div className="space-y-1.5">
        <div
          className={`h-16 flex items-center justify-between gap-1 px-3 py-2 rounded-lg border select-none group ${
            isReadyToPlay 
              ? 'cursor-pointer bg-slate-950/60 border-slate-800/60' 
              : 'cursor-not-allowed bg-slate-950/20 border-slate-800/30'
          }`}
          onClick={(e) => {
            if (!isReadyToPlay) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            handleSeek(clickRatio * duration);
          }}
        >
          {waveformBars.map((height, idx) => {
            const isPlayed = isReadyToPlay && idx <= currentBarIndex;
            return (
              <button
                key={idx}
                type="button"
                disabled={!isReadyToPlay}
                onClick={(e) => {
                  e.stopPropagation();
                  handleWaveformClick(idx);
                }}
                style={{ height: `${Math.round(height * 100)}%` }}
                className={`w-full max-w-[5px] rounded-full transition-all duration-75 ${
                  isReadyToPlay
                    ? isPlayed
                      ? 'bg-emerald-400 group-hover:bg-emerald-300'
                      : 'bg-slate-700 group-hover:bg-slate-600'
                    : 'bg-slate-800'
                }`}
                title={isReadyToPlay ? `Seek to ${formatTime((idx / waveformBars.length) * duration)}` : undefined}
              />
            );
          })}
        </div>

        {/* Time Labels & Scrubber */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
          <span>{formatTime(isReadyToPlay ? currentTime : 0)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
