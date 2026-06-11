import { bufferToWav } from "./audioEngine";

export const TONEFORGE_RECIPES: Record<string, string> = {
  coin: "34T6PkubSQcqrJa4tZjx9piTWmyXLJNFWQuuUshLiz9xBijtf4eNjBm2Vt2UuJZaCyYJ1TLe4g2dssNZ1dihZsULZkpNRDVDaaYdeayKsGuLoSZaczjv8mrS3",
  laser: "11111Cy5fy8MP48pQrhccKeBpJDA7naM9RKEtuGjp9qv85yebTdtYADspKxvWCAcCfZmUYvFP8CpyBhXH1E9ddPmRXUNrKnUL1ZwBXNGXpd7nvndazuXBHqq",
  explosion: "7BMHBGNcpDdT6XAQKsryRogpbahaWEee5FDeNCqu2e2u2MBP8ZSLjhAgKxqasYCesFGJctQ9izHE6aY6ffwHrEquDBFPd11c2oBFXK4ww4kC4seWFAYsrj6UF",
  powerup: "111117hv5tU9UBPNyAyj3ohHjX4qin4HhjVKVoz22Y3zxg2pGLFesz2UFxPpnd9FN4ZcicNZ6QL9FqQFLJxhxTnZheTkFJWfVDEaDBq82GTjdth2P6e8M9z7",
  jump: "11111Emg2E5tu7sbfFQQ4uhCwNbXW6YUVPFBAZRai5VhPMTRAZ3MC7EED4dzhZiPipWjqdES6LmCCio9j5JFiE7sAfhZpNbEBxV7R9ALxXuTsBfJC35FN8wZ"
};

export interface ToneForgeResult {
  recipeKey: string;
  audioBuffer: AudioBuffer;
  blob: Blob;
  audioUrl: string;
}

export async function generateToneForgeSound(recipeKey: string): Promise<ToneForgeResult> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass();
  
  const jsfxr = (window as any).jsfxr;
  if (jsfxr && jsfxr.SoundEffect) {
    try {
      const parameterString = TONEFORGE_RECIPES[recipeKey] || TONEFORGE_RECIPES.laser;
      const sfx = new jsfxr.SoundEffect(parameterString);
      const rendered = sfx.getRawBuffer();
      
      const sampleRate = sfx.sampleRate || 44100;
      const audioBuffer = ctx.createBuffer(1, rendered.normalized.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < rendered.normalized.length; i++) {
        channelData[i] = rendered.normalized[i];
      }
      
      const blob = bufferToWav(audioBuffer);
      const audioUrl = URL.createObjectURL(blob);
      return { recipeKey, audioBuffer, blob, audioUrl };
    } catch (e) {
      console.warn("jsfxr synthesis failed, falling back to procedural Web Audio synthesizer:", e);
    }
  }

  // Pure Web Audio procedural synth fallback
  // This covers laser, explosion, powerup, jump, and coin sounds flawlessly
  const sampleRate = ctx.sampleRate;
  const duration = recipeKey === "explosion" ? 0.7 : 0.35;
  const bufferSize = Math.floor(sampleRate * duration);
  const audioBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = audioBuffer.getChannelData(0);

  if (recipeKey === "coin") {
    // Two distinct high crystal tones playing in sequence
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      let freq = 987.77; // B5
      if (t > 0.08) {
        freq = 1318.51; // E6
      }
      // Simple square/triangle hybrid waves
      let val = Math.sin(t * freq * 2 * Math.PI);
      val += (val > 0 ? 0.3 : -0.3); // add duty harmonic
      const env = t < 0.08 ? (1 - t / 0.08) * 0.7 + 0.3 : (1 - (t - 0.08) / (duration - 0.08));
      data[i] = val * env * 0.2;
    }
  } else if (recipeKey === "laser") {
    // Downwards exponential sweep
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const freq = 1600 * Math.exp(-progress * 4);
      let val = Math.sin(t * freq * 2 * Math.PI);
      if (val > 0.4) val = 0.5;
      if (val < -0.4) val = -0.5; // duty sweep distortion
      const env = (1 - progress);
      data[i] = val * env * 0.25;
    }
  } else if (recipeKey === "explosion") {
    // Filtered noise with quick decay
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      data[i] = (b0 + b1 + b2 + white * 0.5) * 0.12 * (1 - progress);
    }
  } else if (recipeKey === "jump") {
    // Upward frequency sweep
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const freq = 150 + progress * 700;
      const val = Math.sin(t * freq * 2 * Math.PI);
      const env = (1 - progress);
      data[i] = val * env * 0.22;
    }
  } else {
    // Powerup: Upward arpeggio stairs
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const step = Math.floor(progress * 4);
      const freq = 200 * Math.pow(1.5, step);
      const val = Math.sin(t * freq * 2 * Math.PI);
      const env = (1 - progress);
      data[i] = val * env * 0.2;
    }
  }

  const blob = bufferToWav(audioBuffer);
  const audioUrl = URL.createObjectURL(blob);
  return { recipeKey, audioBuffer, blob, audioUrl };
}
