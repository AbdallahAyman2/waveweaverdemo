import React, { useState, useRef, useEffect } from "react";
import { SUGGESTED_PROMPTS } from "../staticData";
import { weaveSound, bufferToWav } from "../audioEngine";
import { drawWaveform } from "../utils";
import { captureTiksAsBlob } from "../tiks-fallback";
import { generateToneForgeSound } from "../toneforge-sfxr";
import { extractSoundParameters } from "../llmChain";
import { getFreesoundKey, getGroqKeys } from "../apiKeys";
import { searchFreesound, upscaleAudio } from "../freesoundFlashSR";

interface GeneratorCardProps {
  userCredits: number;
  onConsumeCredit: () => boolean; // returns true if success
  onAddHistory: (item: {
    prompt: string;
    duration: number;
    influence: number;
    soundType: string;
    audioUrl: string;
  }) => void;
  onGoToPricing: () => void;
}

export default function GeneratorCard({
  userCredits,
  onConsumeCredit,
  onAddHistory,
  onGoToPricing
}: GeneratorCardProps) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(3.5);
  const [influence, setInfluence] = useState(65);
  const [isWeaving, setIsWeaving] = useState(false);
  const [weavingStep, setWeavingStep] = useState("");
  
  // Audio state
  const [currentAudio, setCurrentAudio] = useState<{
    audioUrl: string;
    soundType: string;
    duration: number;
    buffer: AudioBuffer;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Parallel multi-source results area states
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{
    library: { title: string; subtitle: string; loading: boolean; audioUrl?: string; buffer?: AudioBuffer; badge?: string };
    uicraft: { title: string; subtitle: string; loading: boolean; audioUrl?: string; buffer?: AudioBuffer; badge?: string };
    game: { title: string; subtitle: string; loading: boolean; audioUrl?: string; buffer?: AudioBuffer; badge?: string };
    ai: { title: string; subtitle: string; loading: boolean; audioUrl?: string; buffer?: AudioBuffer; badge?: string };
  } | null>(null);
  const [playingSourceId, setPlayingSourceId] = useState<string | null>(null);
  const [keyWarning, setKeyWarning] = useState<string | null>(null);

  // Tilt coordinates
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const cardSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const freepikAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackStartRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const progressIntervalRef = useRef<number | null>(null);

  // Monitor for dynamic API key updates to clear any temporary warning notifications
  useEffect(() => {
    const handleKeysUpdated = () => {
      const fKey = getFreesoundKey();
      const gKeys = getGroqKeys();
      if (fKey && gKeys.length > 0) {
        setKeyWarning(null);
      }
    };
    window.addEventListener("waveweaver_keys_updated", handleKeysUpdated);
    return () => {
      window.removeEventListener("waveweaver_keys_updated", handleKeysUpdated);
    };
  }, []);

  // Listen for custom external prompt loads (from sample library page or dashboard history)
  useEffect(() => {
    const handleLoadPromptEvent = (e: CustomEvent<{ prompt: string; duration?: number; influence?: number }>) => {
      if (e.detail.prompt) setPrompt(e.detail.prompt);
      if (e.detail.duration) setDuration(e.detail.duration);
      if (e.detail.influence) setInfluence(e.detail.influence);
      
      // Scroll to generator card and focus the input
      setTimeout(() => {
        const inputEl = document.getElementById("prompt-input") as HTMLTextAreaElement;
        if (inputEl) {
          inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
          inputEl.focus();
        }
      }, 50);
    };

    window.addEventListener("waveweaver-load-prompt" as any, handleLoadPromptEvent);
    return () => {
      window.removeEventListener("waveweaver-load-prompt" as any, handleLoadPromptEvent);
    };
  }, []);

  // Detect coarse pointers (touchscreen) which don't support hover parallax cleanly
  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    setIsTouchDevice(isTouch);
  }, []);

  // Track mouse coordinates globally to tilt the card when near
  useEffect(() => {
    if (isTouchDevice) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      
      // Calculate card center
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Mouse coordinates
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Compute distances
      const diffX = mouseX - centerX;
      const diffY = mouseY - centerY;
      const distance = Math.hypot(diffX, diffY);
      
      // Dynamic tilt triggered if mouse is within 700 pixels of the card center
      const maxProximityRange = 700;
      if (distance < maxProximityRange) {
        // Proximity factor (1 near center, decays linearly to 0 at max range)
        const proximityFactor = (maxProximityRange - distance) / maxProximityRange;
        
        // Normalize coordinates relative to card size
        const normX = diffX / (rect.width * 1.5);
        const normY = diffY / (rect.height * 1.5);
        
        const clampedY = Math.max(-0.5, Math.min(0.5, normY));
        const clampedX = Math.max(-0.5, Math.min(0.5, normX));
        
        setTilt({
          x: clampedX * 10 * proximityFactor,
          y: clampedY * -10 * proximityFactor
        });
      } else {
        setTilt({ x: 0, y: 0 });
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [isTouchDevice]);

  const handleWeave = async () => {
    if (isWeaving) return;
    const formattedPrompt = prompt.trim() || "cinematic soft background noise sweep";
    
    // Credit validity constraint
    if (userCredits <= 0) {
      alert("You have run out of free weaving credits. Please subscribe to purchase additional credits.");
      onGoToPricing();
      return;
    }

    // API Keys existence check
    const fKey = getFreesoundKey();
    const gKeys = getGroqKeys();
    if (!fKey || gKeys.length === 0) {
      const missing = [];
      if (!fKey) missing.push("Freesound");
      if (gKeys.length === 0) missing.push("Groq");
      setKeyWarning(`API Warning: Missing ${missing.join(" & ")} key(s). Synthesis falls back to local layout engines & rule-based parameters.`);
    } else {
      setKeyWarning(null);
    }

    setIsWeaving(true);
    setShowResults(true);
    setResults({
      library: { title: "Freesound Search", subtitle: "Searching CC0 library...", loading: true },
      uicraft: { title: "UI Sound (tiks)", subtitle: "Synthesizing click...", loading: true },
      game: { title: "Game Sound (ToneForge)", subtitle: "Synthesizing game action...", loading: true },
      ai: { title: "AI Generated (Stable)", subtitle: "Waking up stable audio...", loading: true }
    });
    setWeavingStep("Activating prompt interpretation engine...");
    
    try {
      // 0. Extract parameters using standard LLM fallback chain
      const params = await extractSoundParameters(formattedPrompt, (progressMessage) => {
        setWeavingStep(progressMessage);
      });

      // Stop any existing playing instances
      stopAudio();
      stopCardAudio();

      // Parallel sound sources generation / simulation using LLM Extracted parameters
      // 1. UI Sound (tiks) using params.tiksType
      const uicraftPromise = (async () => {
        try {
          const selectedType = params.tiksType;
          const friendlyNames = {
            click: "UI Click/Tick Sound",
            pop: "UI Pop Action Sfx",
            success: "UI Success chime chime",
            notify: "UI Notification beep beep"
          };
          
          // Capture the live procedural audio synthesis directly into a clean WAV Blob
          const blob = await captureTiksAsBlob(selectedType, 0.3);
          const urlStr = URL.createObjectURL(blob);
          const buf = await decodeAudioUrlIntoBuffer(urlStr);
          
          await new Promise((r) => setTimeout(r, 650));
          setResults((prev) => prev ? {
            ...prev,
            uicraft: {
              title: friendlyNames[selectedType] || `UI ${selectedType} Sfx`,
              subtitle: `LLM Mapped: tiks ${selectedType} synth`,
              loading: false,
              audioUrl: urlStr,
              buffer: buf
            }
          } : null);
          return { audioUrl: urlStr, buffer: buf };
        } catch (error) {
          console.error("Tiks.js generation failed:", error);
          setResults((prev) => prev ? {
            ...prev,
            uicraft: {
              title: "Failed",
              subtitle: "Procedural synthesis failed",
              loading: false,
              audioUrl: undefined,
              buffer: undefined
            }
          } : null);
          return null;
        }
      })();

      // 2. Game Sound (ToneForge) using params.toneforgeRecipe
      const gamePromise = (async () => {
        try {
          const selectedRecipe = params.toneforgeRecipe;
          const friendlyTitles: Record<string, string> = {
            coin: "ToneForge: Retro Coin Collected",
            laser: "ToneForge: Laser Beam Shot",
            explosion: "ToneForge: Retro Detonation",
            powerup: "ToneForge: Retro Power-Up Wave",
            jump: "ToneForge: Platformer Jump Bounce"
          };
          
          const result = await generateToneForgeSound(selectedRecipe);
          
          await new Promise((r) => setTimeout(r, 1250));
          setResults((prev) => prev ? {
            ...prev,
            game: {
              title: friendlyTitles[selectedRecipe] || `ToneForge: ${selectedRecipe}`,
              subtitle: `LLM Mapped: chiptune ${selectedRecipe}`,
              loading: false,
              audioUrl: result.audioUrl,
              buffer: result.audioBuffer
            }
          } : null);
          return { audioUrl: result.audioUrl, buffer: result.audioBuffer };
        } catch (error) {
          console.error("ToneForge jsfxr synthesis failed:", error);
          setResults((prev) => prev ? {
            ...prev,
            game: {
              title: "Failed",
              subtitle: "Procedural card compilation failed",
              loading: false,
              audioUrl: undefined,
              buffer: undefined
            }
          } : null);
          return null;
        }
      })();

      // 3. Freesound Search & FlashSR Super-Resolution (Card 1)
      const libraryPromise = (async () => {
        try {
          setWeavingStep(`Searching Freesound for "${params.searchQuery}"...`);
          const freesoundUrl = await searchFreesound(params.searchQuery, getFreesoundKey());
          
          if (!freesoundUrl) {
            setResults((prev) => prev ? {
              ...prev,
              library: {
                title: "No sound found",
                subtitle: `Checked Freesound CC0 catalog for "${params.searchQuery}"`,
                loading: false,
                audioUrl: undefined,
                buffer: undefined,
                badge: "No Match"
              }
            } : null);
            return null;
          }

          // Fetch MP3 preview
          setWeavingStep("Retrieving sound preview...");
          const audioRes = await fetch(freesoundUrl);
          if (!audioRes.ok) {
            throw new Error(`Failed to fetch preview audio: ${audioRes.statusText}`);
          }
          const audioArrayBuffer = await audioRes.arrayBuffer();

          // Decode with Web Audio
          setWeavingStep("Decoding audio data...");
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const origBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);
          const origSamples = origBuffer.getChannelData(0);
          const origRate = origBuffer.sampleRate;

          let upscaledBuffer: AudioBuffer | undefined;
          let wavBlobUrl: string = freesoundUrl;
          let badgeText = "Enhanced by FlashSR";

          try {
            setWeavingStep("Loading enhancer...");
            // Get FlashSR upscaled Float32Array (48kHz)
            const upscaledSamples = await upscaleAudio(origSamples, origRate, (msg) => {
              setWeavingStep(msg);
            });

            // Convert to 48kHz AudioBuffer
            const outBuffer = audioCtx.createBuffer(1, upscaledSamples.length, 48000);
            outBuffer.copyToChannel(upscaledSamples, 0);
            upscaledBuffer = outBuffer;

            // Convert to WAV Blob URL
            const wavBlob = bufferToWav(outBuffer);
            wavBlobUrl = URL.createObjectURL(wavBlob);
          } catch (modelError) {
            console.warn("FlashSR model loader failed, falling back to original preview:", modelError);
            badgeText = "Low quality (no enhancer)";
            // Fallback to original buffer
            upscaledBuffer = origBuffer;
            // Native WAV creation path
            try {
              const wavBlob = bufferToWav(origBuffer);
              wavBlobUrl = URL.createObjectURL(wavBlob);
            } catch (wavErr) {
              wavBlobUrl = freesoundUrl;
            }
          }

          // Extract friendly filename title
          const title = params.searchQuery.charAt(0).toUpperCase() + params.searchQuery.slice(1) + " SFX";

          setResults((prev) => prev ? {
            ...prev,
            library: {
              title: title,
              subtitle: `Upscaled index from Freesound preview`,
              loading: false,
              audioUrl: wavBlobUrl,
              buffer: upscaledBuffer,
              badge: badgeText
            }
          } : null);

          return { audioUrl: wavBlobUrl, buffer: upscaledBuffer };
        } catch (error: any) {
          console.error("Freesound/FlashSR pipeline search failed:", error);
          const isKeyError = error?.message?.includes("API key");
          const errorMsg = isKeyError
            ? "Add Freesound API key to CONFIG"
            : error?.message || "Inference pipeline error";

          setResults((prev) => prev ? {
            ...prev,
            library: {
              title: "Search Failed",
              subtitle: errorMsg,
              loading: false,
              audioUrl: undefined,
              buffer: undefined,
              badge: "Error"
            }
          } : null);
          return null;
        }
      })();

      // 4. AI Generated (Stable Audio Open ONNX running on a lazy-loaded Web Worker)
      const aiPromise = new Promise<{ res: { audioUrl: string; soundType: string }; buf: AudioBuffer | null }>((resolve) => {
        try {
          // Construct background worker lazily to optimize memory and start time
          const workerUrl = new URL("../aiWorker.ts", import.meta.url);
          const worker = new Worker(workerUrl, { type: "module" });

          worker.onmessage = (e) => {
            const data = e.data;
            if (data.type === "status") {
              const displayMsg = data.message || "Synthesizing sound waves...";
              setResults((prev) => prev ? {
                ...prev,
                ai: {
                  title: "Stable Audio Open (ONNX AI)",
                  subtitle: displayMsg,
                  loading: true
                }
              } : null);
              setWeavingStep(displayMsg);
            } else if (data.type === "done") {
              const { audioData, sampleRate } = data;
              
              // Direct AudioBuffer allocation
              const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
              if (!audioContextRef.current) {
                audioContextRef.current = ctx;
              }
              const audioBuffer = ctx.createBuffer(1, audioData.length, sampleRate);
              audioBuffer.getChannelData(0).set(audioData);
              
              // Multi-channel high-fidelity 16-bit WAV compilation
              const wavBlob = bufferToWav(audioBuffer);
              const audioUrl = URL.createObjectURL(wavBlob);
              
              setResults((prev) => prev ? {
                ...prev,
                ai: {
                  title: "Stable Audio Open (ONNX AI)",
                  subtitle: "Synthesized successfully via ONNX",
                  loading: false,
                  audioUrl,
                  buffer: audioBuffer
                }
              } : null);
              
              worker.terminate();
              resolve({
                res: { audioUrl, soundType: "Stable Audio Open" },
                buf: audioBuffer
              });
            }
          };

          worker.onerror = (err) => {
            console.error("Stable Audio worker error, terminating worker:", err);
            worker.terminate();
            setResults((prev) => prev ? {
              ...prev,
              ai: {
                title: "Failed",
                subtitle: "Stable Audio model error",
                loading: false,
                audioUrl: undefined,
                buffer: undefined
              }
            } : null);
            resolve({
              res: { audioUrl: "", soundType: "Failed" },
              buf: null
            });
          };

          // Post generation task
          worker.postMessage({
            prompt: formattedPrompt,
            duration
          });

        } catch (err) {
          console.error("Failed to allocate background worker. Reverting:", err);
          setResults((prev) => prev ? {
            ...prev,
            ai: {
              title: "Failed",
              subtitle: "Worker allocation failed",
              loading: false,
              audioUrl: undefined,
              buffer: undefined
            }
          } : null);
          resolve({
            res: { audioUrl: "", soundType: "Failed" },
            buf: null
          });
        }
      });

      // Fire them off concurrently. The first three cards activate progressively as soon as they complete.
      const [,,, aiResult] = await Promise.all([
        uicraftPromise,
        gamePromise,
        libraryPromise,
        aiPromise
      ]);

      const { res: result, buf: audioBuffer } = aiResult;

      if (result.audioUrl && audioBuffer) {
        setWeavingStep("Finalizing 16-bit high-fidelity WAV compilation...");
        await new Promise((r) => setTimeout(r, 450));

        // Consume user credit
        const success = onConsumeCredit();
        if (!success) {
          throw new Error("Could not deduct credit.");
        }

        const audioData = {
          audioUrl: result.audioUrl,
          soundType: result.soundType,
          duration: duration,
          buffer: audioBuffer
        };

        setCurrentAudio(audioData);
        
        // Save item in localStorage history
        onAddHistory({
          prompt: formattedPrompt,
          duration,
          influence,
          soundType: result.soundType,
          audioUrl: result.audioUrl,
        });
      } else {
        console.warn("AI generation failed or skipped. Progressive cards are still accessible.");
      }

    } catch (e) {
      console.error(e);
      alert("Sound Weaver encountered an issue compiling the audio blocks.");
    } finally {
      setIsWeaving(false);
      setWeavingStep("");
    }
  };

  // Re-render Waveform when active audio changes
  useEffect(() => {
    if (currentAudio && canvasRef.current) {
      drawWaveform(canvasRef.current, currentAudio.buffer, playbackProgress);
    }
  }, [currentAudio, playbackProgress]);

  // Handle Play / Pause using authentic AudioBufferSourceNode
  const playAudio = () => {
    if (!currentAudio) return;
    if (isPlaying) {
      pauseAudio();
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = currentAudio.buffer;
    source.connect(ctx.destination);

    const offset = pausedAtRef.current;
    source.start(0, offset);

    activeSourceRef.current = source;
    playbackStartRef.current = ctx.currentTime - offset;
    setIsPlaying(true);

    // Dynamic progress bar monitor
    const totalDuration = currentAudio.buffer.duration;
    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = ctx.currentTime - playbackStartRef.current;
      if (elapsed >= totalDuration) {
        stopAudio();
      } else {
        setPlaybackProgress(elapsed / totalDuration);
      }
    }, 30) as unknown as number;

    source.onended = () => {
      // Handles native completion ending
      const elapsed = ctx.currentTime - playbackStartRef.current;
      if (elapsed >= totalDuration - 0.05) {
        stopAudio();
      }
    };
  };

  const pauseAudio = () => {
    if (!isPlaying || !activeSourceRef.current || !audioContextRef.current) return;
    
    activeSourceRef.current.stop();
    activeSourceRef.current = null;
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    const elapsed = audioContextRef.current.currentTime - playbackStartRef.current;
    pausedAtRef.current = elapsed;
    setIsPlaying(false);
  };

  const stopAudio = () => {
    if (activeSourceRef.current) {
      activeSourceRef.current.stop();
      activeSourceRef.current = null;
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    pausedAtRef.current = 0;
    setPlaybackProgress(0);
    setIsPlaying(false);
  };

  // Decode utility for results cards
  const decodeAudioUrlIntoBuffer = async (url: string): Promise<AudioBuffer> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const arrayBuffer = await fetch(url).then((r) => r.arrayBuffer());
    return await audioContextRef.current.decodeAudioData(arrayBuffer);
  };

  // Card play controller
  const playCardAudio = (id: string, buffer?: AudioBuffer, audioUrl?: string) => {
    if (playingSourceId === id) {
      stopCardAudio();
      return;
    }

    if (isPlaying) {
      pauseAudio();
    }
    stopCardAudio();

    if (id === 'library' && audioUrl) {
      // Play using dynamic HTMLAudioElement (using a new Audio object as requested)
      let audio = freepikAudioRef.current;
      if (!audio || audio.src !== audioUrl) {
        audio = new Audio(audioUrl);
        freepikAudioRef.current = audio;
      }
      audio.currentTime = 0;
      audio.play().catch(err => console.error("Error playing Freepik preview:", err));
      setPlayingSourceId(id);
      audio.onended = () => {
        setPlayingSourceId((curr) => curr === id ? null : curr);
      };
      return;
    }

    if (!buffer) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    cardSourceRef.current = source;
    setPlayingSourceId(id);

    source.onended = () => {
      setPlayingSourceId((curr) => curr === id ? null : curr);
    };
  };

  const stopCardAudio = () => {
    if (cardSourceRef.current) {
      try {
        cardSourceRef.current.stop();
      } catch (e) {}
      cardSourceRef.current = null;
    }
    if (freepikAudioRef.current) {
      try {
        freepikAudioRef.current.pause();
        freepikAudioRef.current.currentTime = 0;
      } catch (e) {}
    }
    setPlayingSourceId(null);
  };

  const renderSourceCard = (id: 'library' | 'uicraft' | 'game' | 'ai') => {
    const card = results ? results[id] : null;
    const isLoading = !card || card.loading;
    const isPlayingCard = playingSourceId === id;

    const getIcon = () => {
      switch (id) {
        case 'library': return 'library_music';
        case 'uicraft': return 'touch_app';
        case 'game': return 'sports_esports';
        case 'ai': return 'psychology';
      }
    };

    const getSourceName = () => {
      switch (id) {
        case 'library': return 'Freesound CC0 + FlashSR';
        case 'uicraft': return 'UI Sound (tiks.js)';
        case 'game': return 'Game Sound (ToneForge)';
        case 'ai': return 'AI Generated (Stable)';
      }
    };

    return (
      <div 
        key={id}
        className={`h-[185px] rounded-2xl border p-4 flex flex-col justify-between transition-all duration-300 ${
          isLoading
            ? "bg-slate-500/5 dark:bg-zinc-950/20 border-slate-200/40 dark:border-neutral-900"
            : "bg-white/45 dark:bg-zinc-900/95 border-white/80 dark:border-neutral-800 hover:scale-[1.02] hover:shadow-md"
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-slate-400 dark:text-zinc-500">
            <span className="material-symbols-outlined text-xs select-none">
              {getIcon()}
            </span>
            <span>{getSourceName()}</span>
          </div>

          {isLoading ? (
            <div className="py-1">
              {id === 'ai' && card ? (
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">
                    {card.title || "Stable Audio Open"}
                  </h4>
                  <p className="text-xs text-indigo-600 dark:text-white font-mono font-medium animate-pulse">
                    {card.subtitle}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-300 dark:bg-zinc-800 rounded w-5/6 animate-pulse" />
                  <div className="h-3 bg-slate-200 dark:bg-zinc-900 rounded w-2/3 animate-pulse" />
                </div>
              )}
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">
                {card?.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {card?.subtitle}
              </p>
              {card?.badge && (
                <div className="mt-1.5 flex items-center">
                  <span className="px-1.5 py-0.5 text-[8px] font-extrabold tracking-wide uppercase rounded bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60 font-mono">
                    {card.badge}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading && id === 'ai' && (
          <div className="flex items-center justify-center my-1 select-none pointer-events-none">
            <div className="ai-loading-animation" />
          </div>
        )}

        <div className="flex items-center gap-2 mt-auto">
          <button
            disabled={isLoading || (!card?.buffer && !card?.audioUrl)}
            onClick={() => {
              if (id === 'library' && card?.buffer) {
                playCardAudio(id, card.buffer);
              } else if (id === 'library' && card?.audioUrl) {
                playCardAudio(id, undefined, card.audioUrl);
              } else if (card?.buffer) {
                playCardAudio(id, card.buffer);
              }
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all outline-none cursor-pointer ${
              isLoading
                ? "bg-slate-100 dark:bg-zinc-900 text-slate-300 dark:text-zinc-700 cursor-not-allowed border border-transparent"
                : isPlayingCard
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {isPlayingCard ? "pause" : "play_arrow"}
            </span>
            <span>Play</span>
          </button>

          {isLoading || !card?.audioUrl ? (
            <button
              disabled
              className="py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-300 dark:text-zinc-700 cursor-not-allowed text-xs font-bold flex items-center justify-center gap-1 border border-transparent"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>WAV</span>
            </button>
          ) : (
            <a
              href={card?.audioUrl}
              download={`WaveWeaver_${id}_${(prompt.trim() || 'sfx').toLowerCase().replace(/\s+/g, "_")}.wav`}
              className="py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-aurora-purple to-aurora-magenta text-white hover:brightness-105 active:scale-95 text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-sm1 select-none">download</span>
              <span>WAV</span>
            </a>
          )}
        </div>
      </div>
    );
  };

  const handleRemix = () => {
    if (!currentAudio) return;
    // Remix loads the active sound settings back into prompt box
    alert(`Loaded preset "${currentAudio.soundType}" into the studio. Play with the values to alter synthesis.`);
  };

  const fillPrompt = (txt: string) => {
    setPrompt(txt);
  };

  // Clean play hook on dismount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (activeSourceRef.current) activeSourceRef.current.disconnect();
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 z-10 select-none">
      <div
        ref={cardRef}
        style={{
          transform: !isTouchDevice
            ? `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateZ(0px)`
            : "none",
          transition: isWeaving ? "all 0.5s ease" : "transform 0.15s ease-out"
        }}
        className={`
          relative w-full backdrop-blur-xl bg-white/30 border border-white/60 rounded-[32px] shadow-2xl p-6 md:p-10 flex flex-col gap-6
          transition-all duration-300
          ${isWeaving ? "shadow-indigo-200/50 border-indigo-200/80 ring-2 ring-indigo-100" : ""}
        `}
      >
        {/* Glow effect backdrops */}
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

        {keyWarning && (
          <div className="rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/40 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between gap-3 animate-fade-in relative z-10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base font-bold text-amber-600 dark:text-amber-400">warning</span>
              <p className="font-mono leading-relaxed">{keyWarning}</p>
            </div>
            <button
              onClick={() => setKeyWarning(null)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/20 hover:border-amber-500/40 text-[10px] cursor-pointer whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Text Area Prompt Container */}
        <div className="relative group flex flex-col gap-2">
          <div className="relative w-full">
            <textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isWeaving}
              placeholder="Describe the sound you want to generate... e.g. 'heavy lightning strike and crackling thunder rumble'"
              className={`
                w-full h-44 md:h-52 p-6 rounded-2xl border border-white/80 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none resize-none shadow-inner text-base md:text-xl leading-relaxed
                transition-all duration-300
                ${
                  isWeaving
                    ? "border-slate-100 bg-white/20 text-slate-400 opacity-60"
                    : "hover:border-white hover:bg-white/60 focus:border-indigo-400 focus:bg-white/90 focus:ring-4 focus:ring-indigo-100/50"
                }
              `}
            />
            {prompt.length > 0 && !isWeaving && (
              <button
                onClick={() => setPrompt("")}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/80 active:scale-90 transition-all cursor-pointer shadow-sm"
                title="Clear entry"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Slider Modulators */}
        <div className="pt-6 border-t border-white/60">
          {/* Duration Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="duration-slider" className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">
                Audio Duration
              </label>
              <span className="text-indigo-600 font-semibold font-mono text-xs bg-white/80 px-2 py-0.5 rounded-md border border-white/60 shadow-sm">
                {duration.toFixed(1)}s
              </span>
            </div>
            <input
              id="duration-slider"
              type="range"
              min="0.5"
              max="15"
              step="0.5"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              disabled={isWeaving}
              className="w-full h-1.5 bg-white/60 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 border border-white/40"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>0.5s</span>
              <span>8.0s</span>
              <span>15.0s</span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            id="weave-sound-btn"
            onClick={handleWeave}
            disabled={isWeaving}
            className={`
              relative w-full py-4 rounded-2xl cursor-pointer select-none font-bold text-white text-base md:text-lg
              transition-all duration-300 transform active:scale-[0.98] outline-none flex items-center justify-center gap-3 overflow-hidden
              ${
                isWeaving
                  ? "bg-white/30 text-slate-400 border border-white/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-aurora-purple to-aurora-magenta hover:brightness-110 hover:-translate-y-0.5 shadow-[0_10px_30px_-5px_rgba(100,66,214,0.4)]"
              }
            `}
          >
            {isWeaving ? (
              <div className="flex items-center gap-3 z-10">
                <span className="material-symbols-outlined text-xl animate-spin">
                  progress_activity
                </span>
                <span className="font-mono text-sm tracking-wide">{weavingStep}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 z-10">
                <span className="material-symbols-outlined text-lg">blur_on</span>
                <span>Weave Sound Effect</span>
                <span className="text-xs font-mono font-normal opacity-85 px-1.5 py-0.5 rounded-md bg-white/20 border border-white/20">
                  1 credit
                </span>
              </div>
            )}
            
            {/* Shimmer pulse glow overlay for active button hover */}
            {!isWeaving && (
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-shimmer pointer-events-none" />
            )}
          </button>
        </div>

        {/* Four Parallel Sound Source Comparison area */}
        {showResults && (
          <div className="mt-4 border-t border-slate-200/40 dark:border-white/10 pt-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm select-none animate-pulse">grid_view</span>
                <span>Active Parallel Wave Comparison</span>
              </h3>
              <div className="text-[10px] font-mono font-bold bg-indigo-500/10 dark:bg-zinc-800 text-indigo-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-indigo-200/25 dark:border-neutral-800">
                4 Streams Online
              </div>
            </div>

            {/* Grid layout (Row on desktop, Stack on mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderSourceCard("library")}
              {renderSourceCard("uicraft")}
              {renderSourceCard("game")}
              {renderSourceCard("ai")}
            </div>
          </div>
        )}

        {/* Real-Time WAV Audio Preview Area */}
        {currentAudio && !isWeaving && (
          <div className="mt-4 p-5 bg-white/55 border border-white/70 rounded-2xl overflow-hidden shadow-inner flex flex-col gap-4">
            
            {/* Preview meta section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-white/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-500 border border-white/50">
                  <span className="material-symbols-outlined font-semibold">waves</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {currentAudio.soundType}
                  </h4>
                  <p className="text-xs text-slate-500 truncate max-w-[200px] md:max-w-md">
                    Prompt: "{prompt || "Preset Preview"}"
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-white/80 border border-white/60 text-indigo-700 font-bold px-2 py-0.5 rounded shadow-sm">
                  PCM 16BIT / {currentAudio.duration.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Canvas Waveform Visual */}
            <div className="relative w-full bg-white/40 border border-white/60 rounded-xl py-3 px-4 shadow-inner select-none">
              <canvas ref={canvasRef} className="w-full h-16 block cursor-pointer" />
            </div>

            {/* Audio player triggers bar */}
            <div className="flex items-center justify-between gap-3 mt-2">
              <div className="flex items-center gap-2">
                <button
                  id="preview-play-btn"
                  onClick={playAudio}
                  className="py-2.5 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs md:text-sm cursor-pointer select-none active:scale-95 transition-all flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                  <span>{isPlaying ? "Pause" : "Play Effect"}</span>
                </button>

                <button
                  id="preview-remix-btn"
                  onClick={handleRemix}
                  className="py-2.5 px-4 rounded-full border border-slate-200 hover:bg-white text-slate-600 font-medium text-xs md:text-sm cursor-pointer select-none active:scale-95 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">tune</span>
                  <span>Remix</span>
                </button>
              </div>

              {/* Direct WAV trigger download download */}
              <a
                id="preview-download-link"
                href={currentAudio.audioUrl}
                download={`WaveWeaver_${currentAudio.soundType.toLowerCase().replace(/\s+/g, "_")}.wav`}
                className="py-2.5 px-4 rounded-full bg-gradient-to-r from-aurora-purple to-aurora-magenta text-white font-bold text-xs md:text-sm cursor-pointer select-none active:scale-95 transition-all flex items-center gap-2 shadow-md hover:brightness-105"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Download WAV</span>
              </a>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
