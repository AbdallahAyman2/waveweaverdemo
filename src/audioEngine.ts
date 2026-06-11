/**
 * WaveWeaver Precision Audio Synthesis Engine
 * Generates custom sound effects client-side using Web Audio API OfflineAudioContext
 */

export function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = raw 16-bit PCM
  const bitDepth = 16;
  
  const resultLength = buffer.length * numOfChan * 2 + 44;
  const arrBuffer = new ArrayBuffer(resultLength);
  const view = new DataView(arrBuffer);
  
  let pos = 0;
  
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos + i, str.charCodeAt(i));
    }
    pos += str.length;
  };
  
  const writeUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };
  
  const writeUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  
  // write WAVE header
  writeString("RIFF");
  writeUint32(resultLength - 8);
  writeString("WAVE");
  writeString("fmt ");
  writeUint32(16);
  writeUint16(format);
  writeUint16(numOfChan);
  writeUint32(sampleRate);
  writeUint32(sampleRate * numOfChan * (bitDepth / 8));
  writeUint16(numOfChan * (bitDepth / 8));
  writeUint16(bitDepth);
  
  writeString("data");
  writeUint32(resultLength - pos - 4);
  
  // Write samples
  const channels = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 0;
  while (pos < resultLength) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = channels[i][offset];
      // clamp to -1.0 to 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // scale to 16-bit signed integer
      const scaled = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, scaled, true);
      pos += 2;
    }
    offset++;
  }
  
  return new Blob([arrBuffer], { type: "audio/wav" });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Creates noise buffer (white noise)
 */
function createNoiseBuffer(ctx: BaseAudioContext, durationSeconds: number): AudioBuffer {
  const size = ctx.sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Main sound generator router
 */
export async function weaveSound(
  prompt: string,
  durationSeconds: number,
  influencePercent: number
): Promise<{ audioUrl: string; blob: Blob; soundType: string }> {
  // Normalize settings
  const duration = Math.max(0.5, Math.min(30, durationSeconds));
  const intensity = influencePercent / 100; // creative factor

  // Detect category keywords
  const cleanPrompt = prompt.toLowerCase().trim();
  let category = "scifi"; // default

  if (cleanPrompt.includes("rain") || cleanPrompt.includes("storm") || cleanPrompt.includes("shower") || cleanPrompt.includes("drizzle")) {
    category = "rain";
  } else if (cleanPrompt.includes("footstep") || cleanPrompt.includes("walking") || cleanPrompt.includes("shoe") || cleanPrompt.includes("step") || cleanPrompt.includes("grass")) {
    category = "footsteps";
  } else if (cleanPrompt.includes("clap") || cleanPrompt.includes("applause") || cleanPrompt.includes("cheer")) {
    category = "applause";
  } else if (cleanPrompt.includes("thunder") || cleanPrompt.includes("rumble") || cleanPrompt.includes("explode") || cleanPrompt.includes("explosion") || cleanPrompt.includes("boom")) {
    category = "thunder";
  } else if (cleanPrompt.includes("coin") || cleanPrompt.includes("jump") || cleanPrompt.includes("retro") || cleanPrompt.includes("mario") || cleanPrompt.includes("beep") || cleanPrompt.includes("game")) {
    category = "coin";
  } else if (cleanPrompt.includes("nature") || cleanPrompt.includes("wind") || cleanPrompt.includes("forest") || cleanPrompt.includes("breeze") || cleanPrompt.includes("leaves")) {
    category = "nature";
  } else if (cleanPrompt.includes("robot") || cleanPrompt.includes("cyber") || cleanPrompt.includes("machine") || cleanPrompt.includes("computer") || cleanPrompt.includes("circuit")) {
    category = "robotic";
  } else if (cleanPrompt.includes("laser") || cleanPrompt.includes("zap") || cleanPrompt.includes("beam") || cleanPrompt.includes("phaser") || cleanPrompt.includes("sci-fi")) {
    category = "scifi";
  } else {
    // If no keyword matches, select based on prompt length or word counts to keep it fun
    const hash = cleanPrompt.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const options = ["scifi", "thunder", "robot", "nature"];
    category = options[hash % options.length];
  }

  // Set up Offline Audio Context to render audio in background fast
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  // Apply synthesize recipes
  switch (category) {
    case "rain":
      synthesizeRain(offlineCtx, duration, intensity);
      break;
    case "footsteps":
      synthesizeFootsteps(offlineCtx, duration, intensity);
      break;
    case "applause":
      synthesizeApplause(offlineCtx, duration, intensity);
      break;
    case "thunder":
      synthesizeThunder(offlineCtx, duration, intensity);
      break;
    case "coin":
      synthesizeCoin(offlineCtx, duration, intensity);
      break;
    case "nature":
      synthesizeNatureWind(offlineCtx, duration, intensity);
      break;
    case "robotic":
      synthesizeRobotic(offlineCtx, duration, intensity);
      break;
    case "scifi":
    default:
      synthesizeLaserSpell(offlineCtx, duration, intensity);
      break;
  }

  // Render context
  const renderedBuffer = await offlineCtx.startRendering();
  
  // Convert rendered Buffer to downloadable Wav and DataURIs
  const blob = bufferToWav(renderedBuffer);
  const audioUrl = await blobToBase64(blob);

  // Map clean sound categories for presentation
  const dispCategories: Record<string, string> = {
    rain: "Rain Showers",
    footsteps: "Tactile Footsteps",
    applause: "Warm Applause",
    thunder: "Deep Thunder Rumble",
    coin: "Retro Coin Chime",
    nature: "Earsome Nature Wind",
    robotic: "Cybernetic Heartbeat",
    scifi: "Sci-Fi Laser Charging"
  };

  return {
    audioUrl,
    blob,
    soundType: dispCategories[category] || "Cosmic Warp"
  };
}

/**
 * SYNTHESIZERS RECIPES
 */

function synthesizeLaserSpell(ctx: OfflineAudioContext, duration: number, intensity: number) {
  // Create an oscillator that sweeps down (sci-fi laser style)
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = intensity > 0.6 ? "sawtooth" : "triangle";
  osc2.type = "sine";

  // Rapid pitch drop
  const startFreq = 1200 + intensity * 800;
  const endFreq = 80 + intensity * 50;

  osc.frequency.setValueAtTime(startFreq, 0);
  osc.frequency.exponentialRampToValueAtTime(endFreq, duration * 0.7);

  osc2.frequency.setValueAtTime(startFreq / 2, 0);
  osc2.frequency.exponentialRampToValueAtTime(endFreq / 2, duration * 0.8);

  // Filter sweep
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3000, 0);
  filter.frequency.exponentialRampToValueAtTime(150, duration * 0.6);

  // Volume envelope (zap fadeout)
  gainNode.gain.setValueAtTime(0, 0);
  gainNode.gain.linearRampToValueAtTime(0.4, 0.05); // quick click / transient
  gainNode.gain.exponentialRampToValueAtTime(0.001, duration - 0.05);

  // Routing
  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  
  // High-space age delay pseudo-effect
  const delay = ctx.createDelay();
  const delayGain = ctx.createGain();
  
  delay.delayTime.setValueAtTime(0.2, 0);
  delayGain.gain.setValueAtTime(0.35 * intensity, 0);

  gainNode.connect(ctx.destination);
  gainNode.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(ctx.destination); // feed back to destination

  osc.start(0);
  osc2.start(0);
  osc.stop(duration);
  osc2.stop(duration);
}

function synthesizeRain(ctx: OfflineAudioContext, duration: number, intensity: number) {
  // Generate white noise for steady rain hiss
  const rainSource = ctx.createBufferSource();
  rainSource.buffer = createNoiseBuffer(ctx, duration);
  rainSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1600 - intensity * 500, 0);
  filter.Q.setValueAtTime(0.8, 0);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, 0);
  gain.gain.linearRampToValueAtTime(0.15, duration / 2);
  gain.gain.linearRampToValueAtTime(0.001, duration);

  // Add occasional heavy drops
  const modOsc = ctx.createOscillator();
  modOsc.type = "sine";
  modOsc.frequency.setValueAtTime(10 + intensity * 20, 0); // drips LFO

  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(0.05, 0);

  rainSource.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  rainSource.start(0);
  rainSource.stop(duration);
}

function synthesizeFootsteps(ctx: OfflineAudioContext, duration: number, intensity: number) {
  // Generate sequence of steps
  const totalSteps = Math.max(2, Math.floor(duration * (2 + intensity * 3)));
  const stepInterval = duration / totalSteps;

  for (let s = 0; s < totalSteps; s++) {
    const startTime = s * stepInterval;
    const stepDuration = 0.15 + (1 - intensity) * 0.1;

    // Rustly shoe friction (noise)
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, stepDuration);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    const centerFreq = 400 + Math.random() * 200 + intensity * 600;
    filter.frequency.setValueAtTime(centerFreq, startTime);
    filter.Q.setValueAtTime(2.0, startTime);

    // Deep thud of heel
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, startTime);
    osc.frequency.exponentialRampToValueAtTime(30, startTime + stepDuration * 0.8);

    const gainThud = ctx.createGain();
    gainThud.gain.setValueAtTime(0, startTime);
    gainThud.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    gainThud.gain.exponentialRampToValueAtTime(0.001, startTime + stepDuration * 0.5);

    const gainRustle = ctx.createGain();
    gainRustle.gain.setValueAtTime(0, startTime);
    gainRustle.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gainRustle.gain.exponentialRampToValueAtTime(0.001, startTime + stepDuration);

    noise.connect(filter);
    filter.connect(gainRustle);
    osc.connect(gainThud);

    gainThud.connect(ctx.destination);
    gainRustle.connect(ctx.destination);

    noise.start(startTime);
    osc.start(startTime);
    noise.stop(startTime + stepDuration);
    osc.stop(startTime + stepDuration);
  }
}

function synthesizeApplause(ctx: OfflineAudioContext, duration: number, intensity: number) {
  // Claps are lots of transient spikes of filtered noise
  const clapDensity = Math.floor(25 * intensity * duration);
  
  for (let i = 0; i < clapDensity; i++) {
    const startTime = Math.random() * (duration - 0.2);
    const clapDuration = 0.06 + Math.random() * 0.05;

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, clapDuration);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800 + Math.random() * 800, startTime);
    filter.Q.setValueAtTime(1.5, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + clapDuration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + clapDuration);
  }

  // Steady hum cheering in background if high influence
  if (intensity > 0.45) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, 0);
    osc.frequency.linearRampToValueAtTime(240, duration);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(600, 0);
    bandpass.Q.setValueAtTime(3.0, 0);

    const steadyGain = ctx.createGain();
    steadyGain.gain.setValueAtTime(0, 0);
    steadyGain.gain.linearRampToValueAtTime(0.04 * intensity, 0.4);
    steadyGain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(bandpass);
    bandpass.connect(steadyGain);
    steadyGain.connect(ctx.destination);

    osc.start(0);
    osc.stop(duration);
  }
}

function synthesizeThunder(ctx: OfflineAudioContext, duration: number, intensity: number) {
  // Low frequency noise explosion + rumble
  const durationNoise = duration;
  const thunderSource = ctx.createBufferSource();
  thunderSource.buffer = createNoiseBuffer(ctx, durationNoise);

  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = "lowpass";
  lpFilter.frequency.setValueAtTime(120, 0);
  lpFilter.frequency.exponentialRampToValueAtTime(20, duration - 0.2);

  const gain = ctx.createGain();
  // Lightning strike crack at beginning if creative is high
  const spikeVal = 0.35 + intensity * 0.45;
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(spikeVal, 0.08); // explosive crack!
  gain.gain.linearRampToValueAtTime(spikeVal * 0.4, 0.3); // deep roar
  // rumbles fading
  gain.gain.exponentialRampToValueAtTime(0.001, durationNoise);

  thunderSource.connect(lpFilter);
  lpFilter.connect(gain);
  gain.connect(ctx.destination);

  thunderSource.start(0);
  thunderSource.stop(duration);
}

function synthesizeCoin(ctx: OfflineAudioContext, duration: number, intensity: number) {
  // Classic Mario/retro game double chime (ascending arpeggio)
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "square";
  
  const stepTime = 0.1;
  const note1 = 987.77; // B5
  const note2 = 1318.51; // E6

  osc.frequency.setValueAtTime(note1, 0);
  osc.frequency.setValueAtTime(note2, stepTime);

  gainNode.gain.setValueAtTime(0, 0);
  gainNode.gain.linearRampToValueAtTime(0.25, 0.005);
  gainNode.gain.setValueAtTime(0.2, stepTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(0);
  osc.stop(duration);
}

function synthesizeNatureWind(ctx: OfflineAudioContext, duration: number, intensity: number) {
  // Gentle roaring flow of filtered white noise
  const wind = ctx.createBufferSource();
  wind.buffer = createNoiseBuffer(ctx, duration);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(2.0, 0);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.01, 0);
  gain.gain.linearRampToValueAtTime(0.12, 0.5);

  // LFO to modulate wind frequency (gusts)
  const sweepPoints = Math.floor(duration * 2);
  for (let i = 0; i <= sweepPoints; i++) {
    const time = (i / sweepPoints) * duration;
    const offsetFreq = 400 + Math.sin(time * 1.5) * 200 + intensity * 300;
    filter.frequency.setValueAtTime(offsetFreq, time);
    // modulate swell
    const swellVal = 0.06 + Math.sin(time * 1.2) * 0.04 + intensity * 0.05;
    gain.gain.setValueAtTime(swellVal, time);
  }

  gain.gain.exponentialRampToValueAtTime(0.001, duration);

  wind.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  wind.start(0);
  wind.stop(duration);
}

function synthesizeRobotic(ctx: OfflineAudioContext, duration: number, intensity: number) {
  // A modern electronic heartbeat + high pitch data chirps
  const totalBeats = Math.max(2, Math.floor(duration * 1.3));
  const beatInterval = duration / totalBeats;

  for (let i = 0; i < totalBeats; i++) {
    const time = i * beatInterval;
    const beatDur = 0.25;

    // Sub sine kick
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150 + intensity * 50, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.4, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + beatDur);

    // FM metallic buzz on top of each pulse
    const FMosc = ctx.createOscillator();
    FMosc.type = "sawtooth";
    FMosc.frequency.setValueAtTime(800, time);
    FMosc.frequency.setValueAtTime(150, time + 0.05);

    const FMfilter = ctx.createBiquadFilter();
    FMfilter.type = "bandpass";
    FMfilter.frequency.setValueAtTime(1200, time);
    FMfilter.Q.setValueAtTime(5.0, time);

    const FMgain = ctx.createGain();
    FMgain.gain.setValueAtTime(0, time);
    FMgain.gain.linearRampToValueAtTime(0.06 * intensity, time + 0.01);
    FMgain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    FMosc.connect(FMfilter);
    FMfilter.connect(FMgain);
    FMgain.connect(ctx.destination);

    osc.start(time);
    FMosc.start(time);
    osc.stop(time + beatDur);
    FMosc.stop(time + beatDur);
  }
}
