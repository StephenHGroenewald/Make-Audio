import React from 'react';
import { KOKORO_VOICES, VoiceOption } from '../types/tts';
import { Sparkles, User, Mic } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  onSelectVoice,
  speed,
  onChangeSpeed,
}) => {
  const currentVoice = KOKORO_VOICES.find((v) => v.id === selectedVoiceId) || KOKORO_VOICES[0];
  const quickPicks = KOKORO_VOICES.filter((v) => v.recommended);

  return (
    <div id="voice-settings-panel" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Voice & Speech Controls</h3>
        </div>

        {/* Speed indicator & slider */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">Speed:</span>
          <span className="font-mono font-semibold text-indigo-600 w-8">{speed.toFixed(2)}x</span>
          <input
            id="tts-speed-slider"
            type="range"
            min={0.6}
            max={1.8}
            step={0.05}
            value={speed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className="w-20 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
            title="Speech Speed"
          />
        </div>
      </div>

      {/* Quick pick chips */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-1.5 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Recommended Voices</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPicks.map((voice) => {
            const isSelected = voice.id === selectedVoiceId;
            return (
              <button
                key={voice.id}
                id={`quick-voice-${voice.id}`}
                onClick={() => onSelectVoice(voice.id)}
                className={`text-xs px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span>{voice.accent === 'US' ? '🇺🇸' : '🇬🇧'}</span>
                <span>{voice.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({voice.gender === 'female' ? 'F' : 'M'})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Voice Dropdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        <div>
          <label htmlFor="voice-select-dropdown" className="block text-xs font-medium text-slate-600 mb-1">
            All Kokoro-82M Voices ({KOKORO_VOICES.length})
          </label>
          <select
            id="voice-select-dropdown"
            value={selectedVoiceId}
            onChange={(e) => onSelectVoice(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            <optgroup label="🇺🇸 American English - Female">
              {KOKORO_VOICES.filter((v) => v.accent === 'US' && v.gender === 'female').map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.id}) {v.recommended ? '★' : ''} - {v.description}
                </option>
              ))}
            </optgroup>
            <optgroup label="🇺🇸 American English - Male">
              {KOKORO_VOICES.filter((v) => v.accent === 'US' && v.gender === 'male').map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.id}) {v.recommended ? '★' : ''} - {v.description}
                </option>
              ))}
            </optgroup>
            <optgroup label="🇬🇧 British English - Female">
              {KOKORO_VOICES.filter((v) => v.accent === 'UK' && v.gender === 'female').map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.id}) {v.recommended ? '★' : ''} - {v.description}
                </option>
              ))}
            </optgroup>
            <optgroup label="🇬🇧 British English - Male">
              {KOKORO_VOICES.filter((v) => v.accent === 'UK' && v.gender === 'male').map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.id}) {v.recommended ? '★' : ''} - {v.description}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Selected Voice Details Card */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 flex items-start gap-2.5 text-xs">
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            {currentVoice.accent === 'US' ? 'US' : 'UK'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <span>{currentVoice.name}</span>
              <span className="text-[11px] font-normal text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded">
                {currentVoice.gender === 'female' ? 'Female' : 'Male'} • {currentVoice.accent}
              </span>
            </div>
            <p className="text-slate-600 text-[11px] mt-0.5">{currentVoice.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
