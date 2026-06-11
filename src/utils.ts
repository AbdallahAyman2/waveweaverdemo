/**
 * WaveWeaver UI and Canvas Visuals Utilities
 */

/**
 * Draw a clean, high-fidelity geometric waveform representing real audio data
 * @param canvas HTML Canvas element target
 * @param audioBuffer AudioBuffer containing raw channel waves
 * @param progress Seekhead coefficient (0.0 to 1.0)
 */
export function drawWaveform(
  canvas: HTMLCanvasElement,
  audioBuffer: AudioBuffer,
  progress: number = 0
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = (canvas.width = canvas.parentElement?.clientWidth || 400);
  const h = (canvas.height = 76);
  ctx.clearRect(0, 0, w, h);

  const audioData = audioBuffer.getChannelData(0);
  const step = Math.ceil(audioData.length / w);
  const amp = h / 2;

  for (let i = 0; i < w; i++) {
    let min = 1.0;
    let max = -1.0;
    
    // Sample slices to determine RMS/Peak bounds
    for (let j = 0; j < step; j++) {
      const idx = i * step + j;
      if (idx >= audioData.length) break;
      const datum = audioData[idx];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }

    const currentX = i;
    const barHeight = Math.max(3, (max - min) * amp * 0.95);
    const y = (h - barHeight) / 2;

    const isPlayed = i / w <= progress;
    
    if (isPlayed) {
      // Vibrant interactive brand gradient
      const gradient = ctx.createLinearGradient(currentX, y, currentX, y + barHeight);
      gradient.addColorStop(0, "#6442D6"); // Deep purple
      gradient.addColorStop(1, "#EC4899"); // Vibrant magenta
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = "#E2E8F0"; // Cool Slate
    }

    ctx.beginPath();
    // Rounding rectangles slightly to give high-end modern appearance
    ctx.roundRect ? ctx.roundRect(currentX, y, 1.8, barHeight, 1) : ctx.rect(currentX, y, 1.8, barHeight);
    ctx.fill();
  }
}

/**
 * Format timestamp nicely
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Convert Base64 dataURL back into an AudioBuffer using clean browser context decode API
 */
export function base64ToAudioBuffer(
  base64Url: string,
  audioCtx: AudioContext
): Promise<AudioBuffer> {
  return fetch(base64Url)
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer));
}
