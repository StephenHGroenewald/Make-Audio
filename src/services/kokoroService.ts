import { KokoroTTS } from 'kokoro-js';
import { RawAudio } from '@huggingface/transformers';
import { ModelProgress, GeneratedSpeech, ModelDtype, DeviceMode } from '../types/tts';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

class KokoroService {
  private ttsInstance: KokoroTTS | null = null;
  private currentDtype: ModelDtype = 'q8';
  private currentDevice: DeviceMode = 'wasm';
  private isInitializing: boolean = false;
  private progressListeners: Set<(progress: ModelProgress) => void> = new Set();
  private lastProgress: ModelProgress = {
    status: 'idle',
    progress: 0,
    message: 'Ready to load Kokoro-82M model'
  };

  public subscribeProgress(listener: (progress: ModelProgress) => void): () => void {
    this.progressListeners.add(listener);
    listener(this.lastProgress);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  private notifyProgress(progress: ModelProgress) {
    this.lastProgress = progress;
    this.progressListeners.forEach((fn) => fn(progress));
  }

  public getModelStatus(): ModelProgress {
    return this.lastProgress;
  }

  public async getAvailableDevice(): Promise<'webgpu' | 'wasm'> {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const gpu = (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
        if (gpu && gpu.requestAdapter) {
          const adapter = await gpu.requestAdapter();
          if (adapter) {
            return 'webgpu';
          }
        }
      } catch (e) {
        console.warn('WebGPU check failed, defaulting to WASM', e);
      }
    }
    return 'wasm';
  }

  public async loadModel(dtype: ModelDtype = 'q8', forceReload: boolean = false): Promise<KokoroTTS> {
    if (this.ttsInstance && this.currentDtype === dtype && !forceReload) {
      return this.ttsInstance;
    }

    if (this.isInitializing) {
      // Wait for existing load to complete
      while (this.isInitializing) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (this.ttsInstance) return this.ttsInstance;
    }

    this.isInitializing = true;
    this.currentDtype = dtype;

    const detectedDevice = await this.getAvailableDevice();
    this.currentDevice = detectedDevice;

    this.notifyProgress({
      status: 'downloading',
      progress: 5,
      message: `Connecting to Hugging Face for Kokoro-82M (${dtype})...`
    });

    const progressCallback = (info: {
      status?: string;
      name?: string;
      file?: string;
      progress?: number;
      loaded?: number;
      total?: number;
    }) => {
      if (info.progress !== undefined) {
        const percent = Math.min(100, Math.round(info.progress));
        const file = info.file || info.name || '';
        const loadedMb = info.loaded ? (info.loaded / (1024 * 1024)).toFixed(1) : undefined;
        const totalMb = info.total ? (info.total / (1024 * 1024)).toFixed(1) : undefined;

        let msg = `Loading Kokoro-82M weights... (${percent}%)`;
        if (loadedMb && totalMb) {
          msg = `Downloading weights: ${loadedMb} MB / ${totalMb} MB (${percent}%)`;
        }

        this.notifyProgress({
          status: 'downloading',
          progress: percent,
          file,
          message: msg,
          bytesLoaded: info.loaded,
          bytesTotal: info.total
        });
      } else if (info.status === 'done') {
        this.notifyProgress({
          status: 'loading',
          progress: 95,
          message: 'Initializing neural tokenizer & phonemizer...'
        });
      }
    };

    try {
      this.notifyProgress({
        status: 'downloading',
        progress: 15,
        message: `Initializing Kokoro-82M ONNX model (${detectedDevice.toUpperCase()})...`
      });

      // Try detected device first (e.g. webgpu)
      let instance: KokoroTTS;
      try {
        instance = await KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: dtype,
          device: detectedDevice,
          progress_callback: progressCallback
        });
      } catch (deviceErr) {
        console.warn(`Failed loading with ${detectedDevice}, falling back to WASM:`, deviceErr);
        this.currentDevice = 'wasm';
        instance = await KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: dtype,
          device: 'wasm',
          progress_callback: progressCallback
        });
      }

      this.ttsInstance = instance;
      this.notifyProgress({
        status: 'ready',
        progress: 100,
        message: `Kokoro-82M ready (${this.currentDevice.toUpperCase()}, ${dtype})`
      });

      return instance;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.notifyProgress({
        status: 'error',
        progress: 0,
        message: `Failed to load Kokoro-82M: ${errorMessage}`
      });
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Split text into sentence-sized chunks so large inputs don't hit model sequence limits
   */
  private splitIntoChunks(text: string, maxChunkLen: number = 220): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.length <= maxChunkLen) return [trimmed];

    // Split on sentence boundaries
    const sentences = trimmed.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [trimmed];
    const chunks: string[] = [];
    let current = '';

    for (const s of sentences) {
      const sentenceTrim = s.trim();
      if (!sentenceTrim) continue;

      if ((current + ' ' + sentenceTrim).trim().length <= maxChunkLen) {
        current = (current + ' ' + sentenceTrim).trim();
      } else {
        if (current) {
          chunks.push(current);
        }
        if (sentenceTrim.length > maxChunkLen) {
          // Break overly long sentences by comma or space
          const words = sentenceTrim.split(/\s+/);
          let subChunk = '';
          for (const w of words) {
            if ((subChunk + ' ' + w).trim().length <= maxChunkLen) {
              subChunk = (subChunk + ' ' + w).trim();
            } else {
              if (subChunk) chunks.push(subChunk);
              subChunk = w;
            }
          }
          if (subChunk) current = subChunk;
          else current = '';
        } else {
          current = sentenceTrim;
        }
      }
    }
    if (current) {
      chunks.push(current);
    }
    return chunks;
  }

  public async generateSpeech(
    text: string,
    voice: string = 'af_heart',
    speed: number = 1.0,
    dtype: ModelDtype = 'q8',
    onChunkProgress?: (current: number, total: number) => void
  ): Promise<GeneratedSpeech> {
    const startTime = performance.now();
    const tts = await this.loadModel(dtype);

    const chunks = this.splitIntoChunks(text);
    if (chunks.length === 0) {
      throw new Error('No readable text provided.');
    }

    const audioBuffers: Float32Array[] = [];
    const sampleRate = 24000;
    // 50ms pause between chunks in samples
    const pauseSamples = Math.floor(sampleRate * 0.05);
    const pauseBuffer = new Float32Array(pauseSamples);

    for (let i = 0; i < chunks.length; i++) {
      if (onChunkProgress) {
        onChunkProgress(i + 1, chunks.length);
      }
      const chunkAudio = await tts.generate(chunks[i], {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        voice: voice as any,
        speed: speed
      });

      if (chunkAudio && chunkAudio.audio) {
        audioBuffers.push(chunkAudio.audio);
        if (i < chunks.length - 1) {
          audioBuffers.push(pauseBuffer);
        }
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error('Synthesis generated empty audio.');
    }

    // Combine all chunks into one Float32Array
    const totalLength = audioBuffers.reduce((acc, b) => acc + b.length, 0);
    const combinedAudio = new Float32Array(totalLength);
    let offset = 0;
    for (const b of audioBuffers) {
      combinedAudio.set(b, offset);
      offset += b.length;
    }

    const raw = new RawAudio(combinedAudio, sampleRate);
    const audioBlob = raw.toBlob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const durationSeconds = combinedAudio.length / sampleRate;
    const generationTimeMs = Math.round(performance.now() - startTime);

    return {
      id: `speech-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      voice,
      speed,
      audioBlob,
      audioUrl,
      rawAudioData: combinedAudio,
      samplingRate: sampleRate,
      durationSeconds,
      generationTimeMs,
      createdAt: Date.now()
    };
  }

  public getDevice(): DeviceMode {
    return this.currentDevice;
  }
}

export const kokoroService = new KokoroService();
