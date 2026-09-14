/**
 * Kokoro-82M Text-to-Speech Manager
 * Handles browser-based onnx model loading and synthesis
 */
import { KokoroTTS } from 'kokoro-js';
import { ModelLoadingProgress } from '../types/tts';

let ttsInstance: KokoroTTS | null = null;
let currentDevice: 'webgpu' | 'wasm' = 'wasm';
let isInitializing = false;
let initPromise: Promise<KokoroTTS> | null = null;

export async function checkWebGPUSupport(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return false;
  }
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
    if (!gpu?.requestAdapter) return false;
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

export async function getOrInitKokoro(
  onProgress?: (progress: ModelLoadingProgress) => void,
  preferredDevice?: 'webgpu' | 'wasm'
): Promise<KokoroTTS> {
  if (ttsInstance) {
    return ttsInstance;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      const hasWebGPU = await checkWebGPUSupport();
      const targetDevice: 'webgpu' | 'wasm' = preferredDevice ?? (hasWebGPU ? 'webgpu' : 'wasm');
      currentDevice = targetDevice;

      onProgress?.({
        status: 'loading',
        progress: 5,
        itemText: `Initializing Kokoro-82M (${targetDevice.toUpperCase()} runtime)...`,
        device: targetDevice,
      });

      // Attempt to load with chosen device
      let model: KokoroTTS;
      try {
        model = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
          dtype: 'q8',
          device: targetDevice,
          progress_callback: (item: { status?: string; progress?: number; loaded?: number; total?: number; file?: string }) => {
            if (item.status === 'progress' && item.loaded != null && item.total != null && item.total > 0) {
              const pct = Math.min(99, Math.round((item.loaded / item.total) * 100));
              const fileName = item.file ? item.file.split('/').pop() : 'model weights';
              onProgress?.({
                status: 'loading',
                progress: pct,
                itemText: `Downloading ${fileName} (${pct}%)...`,
                device: targetDevice,
              });
            } else if (item.status === 'initiate') {
              onProgress?.({
                status: 'loading',
                progress: 10,
                itemText: `Loading ${item.file ? item.file.split('/').pop() : 'weights'}...`,
                device: targetDevice,
              });
            }
          },
        });
      } catch (err) {
        // Fallback to WASM if WebGPU failed
        if (targetDevice === 'webgpu') {
          console.warn('WebGPU init failed, falling back to WASM:', err);
          currentDevice = 'wasm';
          onProgress?.({
            status: 'loading',
            progress: 15,
            itemText: 'Switching to WebAssembly (WASM) fallback...',
            device: 'wasm',
          });

          model = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
            dtype: 'q8',
            device: 'wasm',
            progress_callback: (item: { status?: string; progress?: number; loaded?: number; total?: number; file?: string }) => {
              if (item.status === 'progress' && item.loaded != null && item.total != null && item.total > 0) {
                const pct = Math.min(99, Math.round((item.loaded / item.total) * 100));
                const fileName = item.file ? item.file.split('/').pop() : 'model weights';
                onProgress?.({
                  status: 'loading',
                  progress: pct,
                  itemText: `Downloading ${fileName} (${pct}%)...`,
                  device: 'wasm',
                });
              }
            },
          });
        } else {
          throw err;
        }
      }

      ttsInstance = model;
      onProgress?.({
        status: 'ready',
        progress: 100,
        itemText: `Kokoro-82M ready on ${currentDevice.toUpperCase()}`,
        device: currentDevice,
      });

      return model;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load Kokoro-82M model';
      onProgress?.({
        status: 'error',
        progress: 0,
        itemText: 'Failed to initialize model',
        errorMessage: msg,
        device: currentDevice,
      });
      ttsInstance = null;
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

export interface SynthesisResult {
  audioUrl: string;
  blob: Blob;
  duration: number;
  sampleRate: number;
}

export async function synthesizeSpeech(
  text: string,
  voiceId: string,
  speed: number = 1.0,
  onProgress?: (progress: ModelLoadingProgress) => void
): Promise<SynthesisResult> {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Text to synthesize cannot be empty');
  }

  const model = await getOrInitKokoro(onProgress);

  // Cast voice id
  const rawAudio = await model.generate(cleanText, {
    voice: voiceId as any,
    speed: speed,
  });

  const blob = rawAudio.toBlob();
  const audioUrl = URL.createObjectURL(blob);
  const sampleRate = rawAudio.sampling_rate || 24000;
  const duration = rawAudio.audio ? rawAudio.audio.length / sampleRate : 0;

  return {
    audioUrl,
    blob,
    duration,
    sampleRate,
  };
}

export function getCurrentDevice(): 'webgpu' | 'wasm' {
  return currentDevice;
}
