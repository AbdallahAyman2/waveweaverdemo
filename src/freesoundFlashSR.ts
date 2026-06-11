/**
 * Freesound + FlashSR Upscaler Pipeline
 * Integrates Freesound API (license CC0 search) with FlashSR 500KB ONNX model
 * for browser-based high-fidelity 48kHz audio frequency upscaling.
 */

import { getFreesoundKey } from "./apiKeys";

export const CONFIG = {
  FREESOUND_API_KEY: 'YOUR_FREESOUND_API_KEY_HERE',  // Fallback
  GROQ_KEYS: [] as string[]
};

// 1. IndexedDB Helper for model caching
function getFromIDB(key: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("FlashSR_Cache", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("models");
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("models", "readonly");
        const store = tx.objectStore("models");
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          resolve(getReq.result || null);
        };
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

function saveToIDB(key: string, data: ArrayBuffer): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("FlashSR_Cache", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("models");
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("models", "readwrite");
        const store = tx.objectStore("models");
        store.put(data, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      };
      request.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

// 2. Dynamic loader for Ort
async function ensureOrtLoaded(): Promise<any> {
  if ((window as any).ort) return (window as any).ort;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/ort.min.js";
    script.onload = () => resolve((window as any).ort);
    script.onerror = () => reject(new Error("Failed to load ONNX runtime script from CDN"));
    document.head.appendChild(script);
  });
}

// 3. Freesound Search (Creative Commons 0 license)
export async function searchFreesound(query: string, apiKey?: string): Promise<string | null> {
  const token = apiKey || getFreesoundKey() || CONFIG.FREESOUND_API_KEY;
  if (!token || token === 'YOUR_FREESOUND_API_KEY_HERE') {
    throw new Error("Add Freesound API key to CONFIG or Project Settings");
  }

  const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&token=${token}&fields=id,name,previews&filter=license:"Creative Commons 0"&page_size=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Freesound API responded with status ${res.status}`);
  }
  const data = await res.json();
  return data.results?.[0]?.previews?.['preview-hq-mp3'] || null;
}

// 4. Resample Float32Array to 16kHz mono using Web Audio OfflineAudioContext
async function resampleTo16k(float32Array: Float32Array, sampleRate: number): Promise<Float32Array> {
  const targetSampleRate = 16000;
  if (sampleRate === targetSampleRate) return float32Array;

  const length = Math.round(float32Array.length * targetSampleRate / sampleRate);
  const offlineCtx = new OfflineAudioContext(1, length, targetSampleRate);

  const buffer = offlineCtx.createBuffer(1, float32Array.length, sampleRate);
  buffer.copyToChannel(float32Array, 0);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

let globalSession: any = null;

// Get or compile ONNX session for FlashSR
export async function getFlashSRSession(onProgress?: (msg: string) => void): Promise<any> {
  if (globalSession) return globalSession;

  const ort = await ensureOrtLoaded();
  const modelUrl = "https://huggingface.co/YatharthS/FlashSR/resolve/main/onnx/model.onnx";

  onProgress?.("Checking FlashSR local model cache...");
  let modelBuffer = await getFromIDB("flashsr_model");

  if (!modelBuffer) {
    onProgress?.("Downloading FlashSR (500KB)...");
    const response = await fetch(modelUrl);
    if (!response.ok) {
      throw new Error(`Failed to download FlashSR model from Hugging Face: ${response.statusText}`);
    }
    modelBuffer = await response.arrayBuffer();
    await saveToIDB("flashsr_model", modelBuffer);
  }

  onProgress?.("Compiling FlashSR neural upscaler...");
  globalSession = await ort.InferenceSession.create(modelBuffer);
  return globalSession;
}

// 5. FlashSR Neural Upscaler
// upscaleAudio(float32Array, sampleRate) -> resample to 16kHz mono -> run ONNX session -> return 48kHz Float32Array
export async function upscaleAudio(
  float32Array: Float32Array,
  sampleRate: number,
  onProgress?: (msg: string) => void
): Promise<Float32Array> {
  onProgress?.("Resampling to 16kHz for upscaler...");
  const input16k = await resampleTo16k(float32Array, sampleRate);

  onProgress?.("Loading super-resolution upscaler model...");
  const session = await getFlashSRSession(onProgress);
  const ort = (window as any).ort;

  const inputName = session.inputNames[0];
  const inputMeta = session.inputs[inputName];
  const dims = inputMeta?.dims || [1, 1, input16k.length];

  let targetShape: number[];
  if (dims.length === 3) {
    targetShape = [1, 1, input16k.length];
  } else if (dims.length === 2) {
    targetShape = [1, input16k.length];
  } else {
    targetShape = [input16k.length];
  }

  const inputTensor = new ort.Tensor("float32", input16k, targetShape);
  const feeds = { [inputName]: inputTensor };

  onProgress?.("Running frequency reconstruction (200x speed)...");
  const outputs = await session.run(feeds);
  const outputName = session.outputNames[0];
  const outputTensor = outputs[outputName];

  return outputTensor.data as Float32Array;
}
