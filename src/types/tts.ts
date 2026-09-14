export type DeviceMode = 'webgpu' | 'wasm';
export type ModelDtype = 'q8' | 'fp32' | 'fp16' | 'q4';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'Female' | 'Male';
  accent?: 'US' | 'UK';
  language?: string;
  languageLabel?: string;
  grade?: string;
  traits?: string;
  description: string;
  recommended?: boolean;
}

export interface ModelProgress {
  status: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number; // 0 - 100
  message?: string;
  itemText?: string;
  file?: string;
  bytesLoaded?: number;
  bytesTotal?: number;
  errorMessage?: string;
  device?: DeviceMode;
}

export interface GeneratedSpeech {
  id: string;
  text: string;
  voice: string;
  speed: number;
  audioBlob: Blob;
  audioUrl: string;
  rawAudioData?: Float32Array;
  samplingRate: number;
  durationSeconds: number;
  generationTimeMs?: number;
  createdAt: number;
}

export interface ClipboardStatus {
  state: 'granted' | 'prompt' | 'denied' | 'unsupported';
  error?: string | null;
}

export type ClipboardPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

export const KOKORO_VOICES: VoiceOption[] = [
  // US Female
  { id: 'af_heart', name: 'Heart', gender: 'female', accent: 'US', description: 'Warm, natural, expressive tone', recommended: true },
  { id: 'af_bella', name: 'Bella', gender: 'female', accent: 'US', description: 'Clear, engaging, modern female voice', recommended: true },
  { id: 'af_nicole', name: 'Nicole', gender: 'female', accent: 'US', description: 'Soft, gentle, whisper-like quality' },
  { id: 'af_sarah', name: 'Sarah', gender: 'female', accent: 'US', description: 'Friendly and conversational' },
  { id: 'af_sky', name: 'Sky', gender: 'female', accent: 'US', description: 'Energetic and upbeat' },
  { id: 'af_alloy', name: 'Alloy', gender: 'female', accent: 'US', description: 'Neutral, crisp, clear articulation' },
  { id: 'af_jessica', name: 'Jessica', gender: 'female', accent: 'US', description: 'Professional, articulate presentation' },
  { id: 'af_nova', name: 'Nova', gender: 'female', accent: 'US', description: 'Dynamic and youthful' },
  { id: 'af_river', name: 'River', gender: 'female', accent: 'US', description: 'Calm, soothing, meditative cadence' },

  // US Male
  { id: 'am_adam', name: 'Adam', gender: 'male', accent: 'US', description: 'Deep, resonant, authoritative', recommended: true },
  { id: 'am_michael', name: 'Michael', gender: 'male', accent: 'US', description: 'Conversational, natural male voice', recommended: true },
  { id: 'am_echo', name: 'Echo', gender: 'male', accent: 'US', description: 'Balanced and clear narration' },
  { id: 'am_eric', name: 'Eric', gender: 'male', accent: 'US', description: 'Confident, assertive male tone' },
  { id: 'am_fenrir', name: 'Fenrir', gender: 'male', accent: 'US', description: 'Deep baritone with rich presence' },
  { id: 'am_liam', name: 'Liam', gender: 'male', accent: 'US', description: 'Youthful, bright presentation' },
  { id: 'am_onyx', name: 'Onyx', gender: 'male', accent: 'US', description: 'Warm, smooth, radio-style voice' },
  { id: 'am_puck', name: 'Puck', gender: 'male', accent: 'US', description: 'Lively, expressive, animated' },

  // UK Female
  { id: 'bf_emma', name: 'Emma', gender: 'female', accent: 'UK', description: 'Refined British female, polished RP', recommended: true },
  { id: 'bf_isabella', name: 'Isabella', gender: 'female', accent: 'UK', description: 'Expressive and articulate British tone' },
  { id: 'bf_alice', name: 'Alice', gender: 'female', accent: 'UK', description: 'Polite, soft British female' },
  { id: 'bf_lily', name: 'Lily', gender: 'female', accent: 'UK', description: 'Gentle, clear British accent' },

  // UK Male
  { id: 'bm_george', name: 'George', gender: 'male', accent: 'UK', description: 'Distinguished British gentleman', recommended: true },
  { id: 'bm_lewis', name: 'Lewis', gender: 'male', accent: 'UK', description: 'Articulate modern British male' },
  { id: 'bm_daniel', name: 'Daniel', gender: 'male', accent: 'UK', description: 'Classic British documentary narration' },
  { id: 'bm_fable', name: 'Fable', gender: 'male', accent: 'UK', description: 'Engaging, warm British storyteller' },
];

export interface ModelLoadingProgress {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress: number; // 0 - 100
  itemText: string;
  errorMessage?: string;
  device: 'webgpu' | 'wasm';
}

