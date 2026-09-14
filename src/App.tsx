/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useId, useRef } from 'react';
import {
  ClipboardPaste,
  Trash2,
  Volume2,
  Sparkles,
  Cpu,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  AudioWaveform,
  Layers,
  Copy,
  Mic,
  MicOff,
  Menu,
  X,
  ChevronDown,
  MoreVertical
} from 'lucide-react';
import { kokoroService } from './services/kokoroService';
import { VOICES, SAMPLE_TEXTS } from './data/voices';
import { GeneratedSpeech, ModelProgress, ModelDtype } from './types/tts';
import { AudioPlayer } from './components/AudioPlayer';
import { ClipboardBanner } from './components/ClipboardBanner';
import { PWAInstallButton } from './components/PWAInstallButton';
import { checkClipboardPermission, readClipboardText, ClipboardStatus } from './utils/clipboard';

export default function App() {
  const [text, setText] = useState<string>(
    'Hello! This is Kokoro 82M, a neural text-to-speech model running directly in your browser. Paste any text to listen.'
  );
  const [selectedVoice, setSelectedVoice] = useState<string>('af_heart');
  const [speed, setSpeed] = useState<number>(1.0);
  const [dtype, setDtype] = useState<ModelDtype>('fp32');
  const [device, setDevice] = useState<'webgpu' | 'wasm'>('wasm');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isActionsOpen, setIsActionsOpen] = useState<boolean>(false);

  // Loading & generation states
  const [modelProgress, setModelProgress] = useState<ModelProgress>(kokoroService.getModelStatus());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [generatedSpeech, setGeneratedSpeech] = useState<GeneratedSpeech | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Clipboard permission & feedback
  const [clipboardStatus, setClipboardStatus] = useState<ClipboardStatus>({ state: 'prompt' });
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Speech Recognition (Dictation) state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Subscribe to model progress updates and request upfront permissions
  useEffect(() => {
    const unsubscribe = kokoroService.subscribeProgress((p) => {
      setModelProgress(p);
    });

    kokoroService.getAvailableDevice().then((dev) => {
      setDevice(dev);
    });

    // 1. Request microphone permission upfront when the app loads
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('Microphone permission granted upfront');
        })
        .catch((err) => {
          console.warn('Upfront microphone permission feedback:', err);
        });
    }

    // 2. Direct browser-level clipboard read request upfront to prompt the user
    readClipboardText().then((result) => {
      if (result.error) {
        if (result.error.toLowerCase().includes('denied') || result.error.toLowerCase().includes('permission')) {
          setClipboardStatus({ state: 'denied' });
        } else {
          setClipboardStatus({ state: 'prompt' });
        }
      } else {
        setClipboardStatus({ state: 'granted' });
        if (result.text && result.text.trim()) {
          setText(result.text);
          showToast('Loaded text from clipboard!');
        }
      }
    }).catch((err) => {
      console.warn('Upfront clipboard browser-level permission prompt error:', err);
    });

    // 3. Initialize SpeechRecognition dictation
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setText((prev) => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Close Settings Modal on pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
      showToast('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      showToast('Speech recognition stopped');
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          recognitionRef.current.start();
          setIsRecording(true);
          showToast('Listening... Speak now to dictate.');
        })
        .catch(() => {
          showToast('Microphone access is required to dictate.');
        });
    }
  };

  // Toast message auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  /**
   * Handle clipboard paste explicitly requesting permission as needed
   */
  const handlePasteFromClipboard = async () => {
    setClipboardError(null);

    // Call readClipboardText which attempts to read from navigator.clipboard
    const result = await readClipboardText();

    if (result.error) {
      setClipboardError(result.error);
      setClipboardStatus({ state: 'denied', error: result.error });
      return;
    }

    if (result.text && result.text.trim().length > 0) {
      setText(result.text);
      setClipboardStatus({ state: 'granted' });
      showToast(`Pasted ${result.text.length} characters from clipboard`);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else {
      showToast('Clipboard was empty');
    }
  };

  /**
   * Explicitly ask for clipboard permission
   */
  const handleRequestClipboardPermission = async () => {
    setClipboardError(null);
    try {
      const result = await readClipboardText();
      if (result.error) {
        setClipboardError(result.error);
      } else {
        setClipboardStatus({ state: 'granted' });
        showToast('Clipboard permission granted!');
        if (result.text) {
          setText(result.text);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setClipboardError(msg);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!text.trim()) {
      showToast('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Text copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text:', err);
      showToast('Failed to copy text to clipboard');
    }
  };

  /**
   * Generate speech using Kokoro-82M TTS model
   */
  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenerationError(null);
    setChunkProgress(null);

    try {
      const speech = await kokoroService.generateSpeech(
        text,
        selectedVoice,
        speed,
        dtype,
        (current, total) => {
          setChunkProgress({ current, total });
        }
      );
      setGeneratedSpeech(speech);
      showToast(`Synthesized in ${speech.generationTimeMs}ms!`);
    } catch (err: unknown) {
      console.error('Speech synthesis error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setGenerationError(msg || 'Failed to synthesize speech with Kokoro-82M.');
    } finally {
      setIsGenerating(false);
      setChunkProgress(null);
    }
  };

  const currentVoiceMeta = VOICES.find((v) => v.id === selectedVoice) || VOICES[0];
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  // Estimate ~150 words per minute at 1.0x speed
  const estimatedSeconds = Math.round((wordCount / (150 * speed)) * 60) || 1;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-slate-100 text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <AudioWaveform className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">Make Audio</h1>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                  Kokoro-82M ONNX
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                In-browser open-weight neural text-to-speech
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Settings Burger Menu Button */}
            <button
              id="settings-burger-btn"
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer active:scale-95 bg-white shadow-3xs flex items-center justify-center gap-1"
              title="Voice & Speed Settings"
            >
              <Menu className="w-4.5 h-4.5" />
              <span className="hidden sm:inline text-xs font-semibold">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-3.5">
        {/* Clipboard Permission Warning Banner if any */}
        <ClipboardBanner
          status={clipboardStatus}
          lastError={clipboardError}
          onDismissError={() => setClipboardError(null)}
          onRequestPermission={handleRequestClipboardPermission}
        />

        {/* Model Loading State Card (shown when downloading weights) */}
        {modelProgress.status === 'downloading' && (
          <div
            id="model-download-card"
            className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-950 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                {modelProgress.message}
              </span>
              <span className="font-mono text-indigo-700 font-bold">
                {modelProgress.progress}%
              </span>
            </div>
            <div className="w-full bg-indigo-50 rounded-full h-2 overflow-hidden border border-indigo-100">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-200"
                style={{ width: `${Math.max(5, modelProgress.progress)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Weights are downloaded directly from Hugging Face and cached locally in browser storage for instant reuse.
            </p>
          </div>
        )}

        {/* Text Input Area Card */}
        <div
          id="text-input-card"
          className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
        >
          {/* Text Area Header Bar with the Paste Icon Button at the top-right corner */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500">Text Workspace</span>

            {/* Actions Dropdown Button to Save Space */}
            <div className="relative">
              <button
                id="text-actions-dropdown-trigger"
                type="button"
                onClick={() => setIsActionsOpen(!isActionsOpen)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-all shadow-3xs cursor-pointer active:scale-95 select-none"
                title="Text actions (Dictate, Copy, Paste, Clear)"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Actions</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isActionsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Action Dropdown Menu list */}
              {isActionsOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setIsActionsOpen(false)}
                  />

                  {/* Dropdown Options */}
                  <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col gap-0.5">
                    
                    {/* Option 1: Dictate (Microphone) */}
                    <button
                      id="dictate-text-btn"
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        handleToggleRecording();
                      }}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left transition-colors cursor-pointer w-full ${
                        isRecording
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 animate-pulse'
                          : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      {isRecording ? (
                        <MicOff className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Mic className="w-4 h-4 text-indigo-600" />
                      )}
                      <span>{isRecording ? 'Listening...' : 'Dictate'}</span>
                    </button>

                    {/* Option 2: Copy */}
                    <button
                      id="copy-text-btn"
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        handleCopyToClipboard();
                      }}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer text-left w-full"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy</span>
                    </button>

                    {/* Option 3: Paste */}
                    <button
                      id="paste-clipboard-button"
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        handlePasteFromClipboard();
                      }}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 transition-colors cursor-pointer text-left w-full"
                    >
                      <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                      <span>Paste</span>
                    </button>

                    {/* Option 4: Clear (only if there is text) */}
                    {text.length > 0 && (
                      <div className="border-t border-slate-100 my-1 pt-1">
                        <button
                          id="clear-text-btn"
                          type="button"
                          onClick={() => {
                            setIsActionsOpen(false);
                            setText('');
                          }}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer text-left w-full"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                          <span>Clear</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Textarea */}
          <div className="p-4">
            <textarea
              id="tts-text-area"
              ref={textareaRef}
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type text to synthesize with Kokoro-82M... You can also use the Paste button in the top right corner."
              className="w-full text-slate-900 placeholder:text-slate-400 text-sm md:text-base leading-relaxed resize-y outline-hidden bg-transparent"
            />
          </div>


        </div>

        {/* Error Message if Generation Failed */}
        {generationError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-start gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Speech Generation Failed</p>
              <p>{generationError}</p>
            </div>
          </div>
        )}

        {/* Synthesized Audio Player - Always Visible */}
        <div className="animate-in fade-in duration-200">
          <AudioPlayer
            speech={generatedSpeech}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            activeVoiceId={selectedVoice}
            textChanged={generatedSpeech ? generatedSpeech.text !== text : true}
            estimatedDuration={estimatedSeconds}
          />
        </div>
      </main>

      {/* Synthesis stats metrics moved to bottom just before version text */}
      <div className="text-center pt-6 text-[11px] text-slate-400 select-none font-medium">
        {charCount} chars • {wordCount} words • ~{estimatedSeconds}s playback estimate
      </div>

      {/* Tiny version number at the bottom */}
      <footer className="text-center pt-2 pb-4 text-[10px] text-slate-400 font-mono select-none">
        v1.1.8
      </footer>

      {/* Settings Modal Page (Burger Menu Drop-in) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          {/* Transparent Backdrop to close on click outside */}
          <div 
            className="absolute inset-0 cursor-default" 
            onClick={() => setIsSettingsOpen(false)}
          />

          {/* Modal Container */}
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4.5 h-4.5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Voice & Speech Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voice Selection Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="voice-select" className="text-xs font-semibold text-slate-700">
                  Voice Selection
                </label>
                <span className="text-[11px] text-slate-400">{VOICES.length} voices available</span>
              </div>

              <select
                id="voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-850 font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden cursor-pointer"
              >
                <optgroup label="American English — Female">
                  {VOICES.filter((v) => v.language === 'en-us' && v.gender === 'Female').map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.grade}) {v.traits || ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="American English — Male">
                  {VOICES.filter((v) => v.language === 'en-us' && v.gender === 'Male').map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.grade})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="British English — Female">
                  {VOICES.filter((v) => v.language === 'en-gb' && v.gender === 'Female').map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.grade}) {v.traits || ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="British English — Male">
                  {VOICES.filter((v) => v.language === 'en-gb' && v.gender === 'Male').map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.grade})
                    </option>
                  ))}
                </optgroup>
              </select>

              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/40">
                <p className="text-[11px] text-slate-600 leading-normal">
                  <span className="font-semibold text-indigo-900">Accent Details:</span> {currentVoiceMeta.description}
                </p>
              </div>
            </div>

            {/* Speech Speed Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="speed-slider" className="text-xs font-semibold text-slate-700">
                  Speech Speed
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {speed.toFixed(2)}x
                </span>
              </div>

              <div className="pt-1.5">
                <input
                  id="speed-slider"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-450 pt-0.5">
                <span>0.5x</span>
                <button
                  type="button"
                  onClick={() => setSpeed(1.0)}
                  className="hover:text-indigo-600 font-semibold cursor-pointer"
                >
                  Reset (1.0x)
                </button>
                <span>2.0x</span>
              </div>
            </div>

            {/* Save / Close Action Button */}
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(false);
                showToast(`Applied: ${currentVoiceMeta.name} @ ${speed.toFixed(2)}x`);
              }}
              className="w-full mt-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-xs transition shadow-xs cursor-pointer active:scale-95 text-center"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
