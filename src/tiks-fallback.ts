import { bufferToWav } from "./audioEngine";

export const DEFAULT_THEME = {
  name: "soft",
  baseFreq: 440,
  noiseColor: "pink",
  oscType: "sine",
  filterFreq: 3000,
  filterQ: 2,
  attack: 0.002,
  decay: 1,
  brightness: 2000
};

let pinkNoiseBuffer: AudioBuffer | null = null;
let whiteNoiseBuffer: AudioBuffer | null = null;

function getPinkNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (pinkNoiseBuffer && pinkNoiseBuffer.sampleRate === ctx.sampleRate) return pinkNoiseBuffer;
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.550 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    data[i] *= 0.11;
    b6 = white * 0.115926;
  }
  pinkNoiseBuffer = buffer;
  return buffer;
}

function getWhiteNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (whiteNoiseBuffer && whiteNoiseBuffer.sampleRate === ctx.sampleRate) return whiteNoiseBuffer;
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  whiteNoiseBuffer = buffer;
  return buffer;
}

export function synthTiksSound(
  ctx: BaseAudioContext,
  dest: AudioNode,
  type: 'click' | 'pop' | 'success' | 'notify',
  volumeMultiplier: number = 0.3
) {
  const e = ctx.currentTime + 0.005;
  const theme = DEFAULT_THEME;

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(volumeMultiplier, e);
  mainGain.connect(dest);

  if (type === 'click') {
    const a = Math.max(0.013 * theme.decay, 0.005);
    const r = ctx.createBufferSource();
    r.buffer = theme.noiseColor === 'pink' ? getPinkNoiseBuffer(ctx) : getWhiteNoiseBuffer(ctx);
    r.loop = true;
    const i = ctx.createBiquadFilter();
    i.type = "bandpass";
    i.frequency.value = theme.filterFreq;
    i.Q.value = theme.filterQ;
    const c = ctx.createGain();
    c.gain.setValueAtTime(0.001, e);
    c.gain.linearRampToValueAtTime(0.9, e + Math.min(theme.attack, a * 0.5));
    c.gain.exponentialRampToValueAtTime(0.001, e + a);
    r.connect(i);
    i.connect(c);
    c.connect(mainGain);
    r.start(e);
    r.stop(e + a);
  } else if (type === 'pop') {
    const a = Math.max(0.08 * theme.decay, 0.005);
    const r = theme.baseFreq / 440;
    const osc = ctx.createOscillator();
    osc.type = theme.oscType as OscillatorType;
    osc.frequency.setValueAtTime(800 * r, e);
    osc.frequency.exponentialRampToValueAtTime(200 * r, e + a);
    const c = Math.min(theme.attack, a * 0.2);
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, e);
    gainNode.gain.linearRampToValueAtTime(0.9, e + c);
    gainNode.gain.exponentialRampToValueAtTime(0.001, e + a);
    osc.connect(gainNode);
    gainNode.connect(mainGain);
    osc.start(e);
    osc.stop(e + a);
  } else if (type === 'success') {
    const a = theme.baseFreq / 440;
    const r = theme.attack;
    const i = Math.max(0.1 * theme.decay, 0.005);
    const o1 = ctx.createOscillator();
    o1.type = theme.oscType as OscillatorType;
    o1.frequency.value = 523 * a;
    const s1 = ctx.createGain();
    s1.gain.setValueAtTime(0.001, e);
    s1.gain.linearRampToValueAtTime(0.75, e + r);
    s1.gain.exponentialRampToValueAtTime(0.001, e + i);
    o1.connect(s1);
    s1.connect(mainGain);
    o1.start(e);
    o1.stop(e + i);

    const u = Math.max(0.08 * theme.decay, 0.005);
    const p = Math.max(0.15 * theme.decay, 0.005);
    const o2 = ctx.createOscillator();
    o2.type = theme.oscType as OscillatorType;
    o2.frequency.value = 784 * a;
    const s2 = ctx.createGain();
    s2.gain.setValueAtTime(0.001, e + u);
    s2.gain.linearRampToValueAtTime(0.75, e + u + r);
    s2.gain.exponentialRampToValueAtTime(0.001, e + u + p);
    o2.connect(s2);
    s2.connect(mainGain);
    o2.start(e + u);
    o2.stop(e + u + p);
  } else if (type === 'notify') {
    const a = Math.max(0.18 * theme.decay, 0.005);
    const r = Math.max(0.3 * theme.decay, 0.005);
    const i = Math.max(0.1 * theme.decay, 0.02);
    const o1 = ctx.createOscillator();
    o1.type = theme.oscType as OscillatorType;
    o1.frequency.value = theme.baseFreq * 2;
    const s1 = ctx.createGain();
    s1.gain.setValueAtTime(0.001, e);
    s1.gain.linearRampToValueAtTime(0.6, e + theme.attack);
    s1.gain.exponentialRampToValueAtTime(0.001, e + a);
    o1.connect(s1);
    s1.connect(mainGain);
    o1.start(e);
    o1.stop(e + a);

    const u = e + i;
    const o2 = ctx.createOscillator();
    o2.type = theme.oscType as OscillatorType;
    o2.frequency.value = theme.baseFreq * 3;
    const s2 = ctx.createGain();
    s2.gain.setValueAtTime(0.001, u);
    s2.gain.linearRampToValueAtTime(0.6, u + theme.attack);
    s2.gain.exponentialRampToValueAtTime(0.001, u + r);
    o2.connect(s2);
    s2.connect(mainGain);
    o2.start(u);
    o2.stop(u + r);
  }
}

export function playTiksSoundLive(type: 'click' | 'pop' | 'success' | 'notify', volume: number = 0.3) {
  // If actual window.tiks is loaded, use it
  const globalTiks = (window as any).tiks;
  if (globalTiks && typeof globalTiks[type] === 'function') {
    try {
      globalTiks[type]();
      return;
    } catch (e) {
      console.warn("Global tiks failed, using custom synthesis fallback:", e);
    }
  }

  // Fallback direct AudioContext play
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    synthTiksSound(ctx, ctx.destination, type, volume);
  } catch (err) {
    console.error("Failed to play tiks fallback sound:", err);
  }
}

export async function captureTiksAsBlob(type: 'click' | 'pop' | 'success' | 'notify', volume: number = 0.3): Promise<Blob> {
  const sampleRate = 44100;
  // A 1-second long buffer is plenty for short UI sounds
  const duration = 1.0;
  const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * duration), sampleRate);

  synthTiksSound(offlineCtx, offlineCtx.destination, type, volume);

  const renderedBuffer = await offlineCtx.startRendering();
  return bufferToWav(renderedBuffer);
}

// Attach a bullet-proof fallback window.tiks shim
export function setupTiksShim() {
  if (typeof window === "undefined") return;

  let currentVolume = 0.3;
  let currentTheme = 'soft';

  const tiksShim = {
    init: (config?: { theme?: string; volume?: number }) => {
      console.log("[Tiks Shim] Initialized with config:", config);
      if (config?.volume !== undefined) currentVolume = config.volume;
      if (config?.theme !== undefined) currentTheme = config.theme;
      
      // Try to initialize actual global if loaded
      const actualTiks = (window as any).tiks;
      if (actualTiks && actualTiks !== tiksShim && typeof actualTiks.init === 'function') {
        try {
          actualTiks.init(config);
        } catch (e) {}
      }
    },
    click: () => playTiksSoundLive('click', currentVolume),
    pop: () => playTiksSoundLive('pop', currentVolume),
    success: () => playTiksSoundLive('success', currentVolume),
    notify: () => playTiksSoundLive('notify', currentVolume),
    setVolume: (vol: number) => {
      currentVolume = vol;
    },
    setTheme: (themeName: string) => {
      currentTheme = themeName;
    }
  };

  // If window.tiks is not found, or is not populated properly, merge or define it
  if (!(window as any).tiks) {
    (window as any).tiks = tiksShim;
  } else {
    // Merge functions in case some are missing
    const existing = (window as any).tiks;
    for (const key of ['init', 'click', 'pop', 'success', 'notify'] as const) {
      if (typeof existing[key] !== 'function') {
        existing[key] = tiksShim[key];
      }
    }
  }
}
