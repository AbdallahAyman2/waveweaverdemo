import React, { useState, useEffect } from "react";
import { weaveSound } from "../audioEngine";

interface SoundBubblesProps {
  onPlayPreset: (prompt: string, category: string) => Promise<void>;
}

interface SoundSample {
  id: string;
  title: string;
  prompt: string;
  description: string;
  category: "Nature & Weather" | "Sci-Fi" | "Human & UI" | "Retro Arcade";
  duration: number;
}

const PRESET_SAMPLES: SoundSample[] = [
  {
    id: "preset-1",
    title: "Deep Thunder Storm",
    prompt: "distant heavy thunder rolling across deep valleys",
    description: "Low-frequency atmospheric storm rumbles with dramatic pressure decay.",
    category: "Nature & Weather",
    duration: 5.5,
  },
  {
    id: "preset-2",
    title: "Gentle Rain Showers",
    prompt: "rain falling gently on windshield of stationary car",
    description: "Soft micro-droplets rustling against sleek laminated windshield surfaces.",
    category: "Nature & Weather",
    duration: 3.5,
  },
  {
    id: "preset-3",
    title: "Cyber Mainframe Pulse",
    prompt: "cybernetic pulse inside a deep mainframe computer circuit",
    description: "Rhythmic modular electronic system pulses and diagnosis sweeps.",
    category: "Sci-Fi",
    duration: 2.0,
  },
  {
    id: "preset-4",
    title: "Arcade Retro Coin",
    prompt: "retro video game coin jump chime collection sound",
    description: "Classic 8-bit dual frequency square-wave jump trigger beep.",
    category: "Retro Arcade",
    duration: 1.0,
  },
  {
    id: "preset-5",
    title: "Forest Autumn Breeze",
    prompt: "soft autumn breeze leaves rustling in forest with soft birds humming",
    description: "Organic rustling foliage whispers with high-frequency breeze layers.",
    category: "Nature & Weather",
    duration: 3.8,
  },
  {
    id: "preset-6",
    title: "Laser Beam Sweep",
    prompt: "laser beam weapon charging with dynamic frequency sweep",
    description: "Expanding plasma beam charge up concluding with a sharp blast trigger.",
    category: "Sci-Fi",
    duration: 2.2,
  },
  {
    id: "preset-7",
    title: "Audience Theater Cheer",
    prompt: "theatre audience applauding and cheering enthusiastically",
    description: "Warm acoustic environment filled with crowded applause and applause flares.",
    category: "Human & UI",
    duration: 4.0,
  }
];

const MACRO_TABS = [
  { id: "all", name: "All Synthetics", color: "from-indigo-500 to-purple-500" },
  { id: "nature", name: "Atmospheric Nature", color: "from-emerald-400 to-teal-500" },
  { id: "scifi", name: "Cybernetic/Sci-Fi", color: "from-violet-500 to-indigo-600" },
  { id: "arcade-ui", name: "Classic Arcade & UI", color: "from-orange-400 to-rose-500" }
] as const;

export default function SoundBubbles({ onPlayPreset }: SoundBubblesProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter presets based on active high-level segmented tab
  const getFilteredPresets = (): SoundSample[] => {
    switch (activeTab) {
      case "nature":
        return PRESET_SAMPLES.filter((s) => s.category === "Nature & Weather");
      case "scifi":
        return PRESET_SAMPLES.filter((s) => s.category === "Sci-Fi");
      case "arcade-ui":
        return PRESET_SAMPLES.filter((s) => s.category === "Retro Arcade" || s.category === "Human & UI");
      default:
        return PRESET_SAMPLES;
    }
  };

  const activePresets = getFilteredPresets();

  // Guard activeIndex range when presets filters change
  useEffect(() => {
    if (carouselIndex >= activePresets.length) {
      setCarouselIndex(Math.max(0, activePresets.length - 1));
    }
  }, [activeTab, activePresets.length]);

  // Play Active Sample Preview Audition
  const handlePlaySample = async (sample: SoundSample) => {
    if (playingId) return;
    setPlayingId(sample.id);

    try {
      await onPlayPreset(sample.prompt, sample.title.toLowerCase());
    } catch (e) {
      console.error("Sampling audition error", e);
    } finally {
      setPlayingId(null);
    }
  };

  // Direct High fidelity WAV generation & download
  const handleDownloadSample = async (e: React.MouseEvent, sample: SoundSample) => {
    e.stopPropagation();
    if (downloadingId) return;
    setDownloadingId(sample.id);

    try {
      const result = await weaveSound(sample.prompt, sample.duration, 70);
      const link = document.createElement("a");
      link.href = result.audioUrl;
      link.download = `WaveWeaver_${sample.title.toLowerCase().replace(/\s+/g, "_")}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download synthesis exception", err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Dispatch prompt back to main weave generator board card
  const handleUsePrompt = (prompt: string, duration: number) => {
    window.dispatchEvent(
      new CustomEvent("waveweaver-load-prompt", {
        detail: { prompt, duration, influence: 65 }
      })
    );
  };

  // Safe navigation controls
  const prevSlide = () => {
    setCarouselIndex((prev) => (prev === 0 ? activePresets.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev === activePresets.length - 1 ? 0 : prev + 1));
  };

  const renderLavaLamp = (id: string, isCenterObj: boolean) => {
    // Custom beautiful organic colors matching the category
    let colors = ["bg-amber-400", "bg-orange-500", "bg-rose-600"];
    switch (id) {
      case "preset-1": // Thunder storm: Cosmic deep amethyst with electrical warm amber
        colors = ["bg-purple-900", "bg-indigo-600", "bg-amber-500"];
        break;
      case "preset-2": // Gentle rain: Soft emerald, marine teal, cool blue
        colors = ["bg-emerald-400", "bg-teal-600", "bg-sky-500"];
        break;
      case "preset-3": // Cyber pulse: High-power violet, fuchsia, cyan spark
        colors = ["bg-violet-600", "bg-fuchsia-500", "bg-cyan-400"];
        break;
      case "preset-4": // Retro coin: Electric blue, arcade pink, bright yellow
        colors = ["bg-blue-600", "bg-pink-500", "bg-yellow-400"];
        break;
      case "preset-5": // Forest winds: Golden gold, foliage amber, forest green
        colors = ["bg-yellow-400", "bg-amber-500", "bg-emerald-600"];
        break;
      case "preset-6": // Laser beam: Deep indigo, neon purple, hot rose
        colors = ["bg-indigo-700", "bg-purple-500", "bg-rose-500"];
        break;
      case "preset-7": // Crowd cheer: Sunrise red, glowing magenta, safety orange
        colors = ["bg-red-500", "bg-pink-500", "bg-orange-400"];
        break;
    }

    return (
      <div className="lava-lamp-container">
        {/* Background plate */}
        <div className="absolute inset-0 bg-slate-950" />
        {/* Shifting blobs */}
        <div className={`lava-blob lava-blob-1 ${colors[0]} opacity-80`} />
        <div className={`lava-blob lava-blob-2 ${colors[1]} opacity-80`} />
        <div className={`lava-blob lava-blob-3 ${colors[2]} opacity-80`} />
        {/* Shiny surface reflections */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/12 pointer-events-none rounded-full" />
        <div className="absolute top-[3%] left-[15%] w-[70%] h-[35%] rounded-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none blur-[1px]" />
      </div>
    );
  };

  if (activePresets.length === 0) return null;

  // Track sliding calculations
  const cardWidth = isMobile ? 260 : 320;
  const gapWidth = isMobile ? 16 : 24;
  const step = cardWidth + gapWidth;

  return (
    <section className="w-full max-w-5xl mx-auto py-10 md:py-14 px-4 select-none relative overflow-hidden">
      {/* Lava Lamp style definitions injected dynamically for flawless GPU performance */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes lava-blob-one {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
          33% { transform: translate(8%, -12%) scale(1.1) rotate(120deg); border-radius: 70% 30% 52% 48% / 60% 40% 60% 40%; }
          66% { transform: translate(-6%, 8%) scale(0.9) rotate(240deg); border-radius: 30% 70% 40% 60% / 50% 60% 40% 50%; }
          100% { transform: translate(0, 0) scale(1) rotate(360deg); border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
        }
        @keyframes lava-blob-two {
          0% { transform: translate(0, 0) scale(1.05) rotate(0deg); border-radius: 50% 50% 30% 70% / 50% 60% 40% 50%; }
          50% { transform: translate(-8%, 10%) scale(0.9) rotate(-180deg); border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
          100% { transform: translate(0, 0) scale(1.05) rotate(-360deg); border-radius: 50% 50% 30% 70% / 50% 60% 40% 50%; }
        }
        @keyframes lava-blob-three {
          0% { transform: translate(0, 0) scale(0.95) rotate(0deg); border-radius: 30% 70% 40% 60% / 50% 60% 40% 50%; }
          50% { transform: translate(8%, 6%) scale(1.1) rotate(180deg); border-radius: 70% 30% 52% 48% / 60% 40% 60% 40%; }
          100% { transform: translate(0, 0) scale(0.95) rotate(360deg); border-radius: 30% 70% 40% 60% / 50% 60% 40% 50%; }
        }
        .lava-lamp-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background-color: #030712;
          border-radius: 9999px;
          filter: blur(6px) contrast(15);
          backface-visibility: hidden;
          transform: translate3d(0, 0, 0);
        }
        .lava-blob {
          position: absolute;
          border-radius: 50%;
          mix-blend-mode: screen;
          will-change: transform;
          backface-visibility: hidden;
          filter: blur(10px);
        }
        .lava-blob-1 {
          width: 75%;
          height: 75%;
          top: 12%;
          left: 12%;
          animation: lava-blob-one 14s infinite linear;
        }
        .lava-blob-2 {
          width: 70%;
          height: 70%;
          bottom: 15%;
          right: 15%;
          animation: lava-blob-two 16s infinite linear;
        }
        .lava-blob-3 {
          width: 55%;
          height: 55%;
          top: 22%;
          right: 12%;
          animation: lava-blob-three 11s infinite linear;
        }
      ` }} />

      {/* Title Segment - named explore sample sounds exactly as requested */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          Explore Sample Sounds
        </h2>
        <p className="text-slate-500 mt-2 max-w-lg mx-auto text-xs md:text-sm leading-relaxed">
          Select or custom-fit pre-synthesized acoustic templates with mesmerizing generative elements.
        </p>
      </div>

      {/* 1. Top Segmented Tabs: Filtering macro categories */}
      <div className="flex justify-center gap-2 md:gap-4 mb-8 overflow-x-auto pb-2 border-b border-indigo-50/50">
        {MACRO_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCarouselIndex(0);
            }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-bold cursor-pointer transition-all duration-300 shrink-0
              ${
                activeTab === tab.id
                  ? "bg-white border border-slate-200 text-slate-900 shadow-md scale-102"
                  : "bg-transparent text-slate-500 hover:text-slate-800 border-transparent hover:bg-white/30"
              }
            `}
          >
            <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${tab.color}`} />
            {tab.name}
          </button>
        ))}
      </div>

      {/* 2. Seamless Continuous Slider: Displays active items */}
      <div className="relative flex items-center min-h-[520px] md:min-h-[610px] py-12 overflow-hidden rounded-2xl w-full">
        
        {/* Navigation track wrapper with continuous transition offsets */}
        <div 
          className="absolute left-1/2 flex flex-row flex-nowrap items-center transition-transform duration-500 ease-out will-change-transform"
          style={{ 
            transform: `translate3d(-${carouselIndex * step + cardWidth / 2}px, 0px, 0px)`,
            width: `${activePresets.length * step}px`,
            minWidth: "max-content",
            gap: `${gapWidth}px`
          }}
        >
          {activePresets.map((item, idx) => {
            const isCenterObj = idx === carouselIndex;
            const isVisible = Math.abs(idx - carouselIndex) <= 1;
            return (
              <div
                key={item.id}
                onClick={() => setCarouselIndex(idx)}
                style={{ width: `${cardWidth}px` }}
                className={`
                  flex flex-col items-center bg-white/20 border border-white/60 backdrop-blur-xl rounded-[28px] p-6 text-center shadow-lg transition-all duration-500 ease-in-out cursor-pointer select-none shrink-0
                  ${
                    isCenterObj
                      ? "scale-105 opacity-100 border-indigo-200/50 shadow-2xl z-10 translate-y-0"
                      : "scale-90 opacity-45 hover:opacity-60 blur-[0.4px] translate-y-3"
                  }
                `}
              >
                {/* Tactile Sphere/Orb Container */}
                <div className="relative w-full aspect-square rounded-full overflow-hidden mb-5 group shadow-inner">
                  {/* Organic Lava Lamp element */}
                  {isVisible ? (
                    renderLavaLamp(item.id, isCenterObj)
                  ) : (
                    <div className="absolute inset-0 bg-slate-950 flex items-center justify-center rounded-full">
                      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 opacity-90" />
                    </div>
                  )}

                  {/* Play Audition trigger overlay inside Center focusing element */}
                  {isCenterObj && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 hover:bg-black/15 transition-all duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySample(item);
                        }}
                        disabled={playingId !== null && playingId !== item.id}
                        className="w-14 h-14 bg-white hover:bg-indigo-600 hover:text-white text-slate-900 rounded-full flex items-center justify-center shadow-lg transform transition active:scale-90 hover:scale-110 group/btn"
                        title="Audition wave stream"
                      >
                        {playingId === item.id ? (
                          <span className="material-symbols-outlined text-2xl animate-spin">
                            progress_activity
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-2xl ml-0.5 transition-transform group-hover/btn:scale-115">
                            play_arrow
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Typography metadata */}
                <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1 justify-center tracking-tight">
                  {item.title} {isCenterObj && <span className="text-xs text-indigo-500">↗</span>}
                </h3>
                <p className={`text-[11px] text-slate-500 mt-1 line-clamp-2 max-w-[210px] transition-opacity duration-300 ${isCenterObj ? "opacity-100" : "opacity-0"}`}>
                  {item.description}
                </p>

                {/* Actions buttons inside Glass Card focus */}
                {isCenterObj && (
                  <div className="flex items-center gap-2.5 mt-4 w-full animate-fade-in">
                    <button
                      onClick={() => handleUsePrompt(item.prompt, item.duration)}
                      className="flex-1 py-1.5 rounded-full bg-slate-900 text-white hover:bg-indigo-500 text-[11px] font-extrabold shadow-sm active:scale-95 transition-all duration-150"
                    >
                      Use Prompt
                    </button>
                    
                    <button
                      onClick={(e) => handleDownloadSample(e, item)}
                      disabled={downloadingId !== null}
                      className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 text-[11px] font-bold active:scale-90 transition-all cursor-pointer flex items-center justify-center"
                      title="Synthesize and Download WAV file"
                    >
                      {downloadingId === item.id ? (
                        <span className="material-symbols-outlined text-sm animate-bounce">
                          downloading
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">
                          download
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Left Arrow Button Overlaid */}
        <button
          onClick={(e) => { e.stopPropagation(); prevSlide(); }}
          className="absolute left-1 md:left-4 z-20 w-10 h-10 rounded-full bg-white/80 border border-white hover:bg-white text-slate-700 hover:text-indigo-600 flex items-center justify-center cursor-pointer shadow-md active:scale-90 transition-all text-sm font-bold"
          aria-label="Previous slide"
        >
          &lt;
        </button>

        {/* Right Arrow Button Overlaid */}
        <button
          onClick={(e) => { e.stopPropagation(); nextSlide(); }}
          className="absolute right-1 md:right-4 z-20 w-10 h-10 rounded-full bg-white/80 border border-white hover:bg-white text-slate-700 hover:text-indigo-600 flex items-center justify-center cursor-pointer shadow-md active:scale-90 transition-all text-sm font-bold"
          aria-label="Next slide"
        >
          &gt;
        </button>
      </div>

      {/* 3. Bottom Sub-Navigation: handles fine-tune selection */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-5 border-t border-indigo-50/50">
        <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase mr-2 max-sm:w-full max-sm:text-center max-sm:mb-2">
          Jump to Use Case
        </span>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {activePresets.map((itm, idx) => (
            <button
              key={`shortcut-${itm.id}`}
              onClick={() => setCarouselIndex(idx)}
              className={`
                px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold cursor-pointer transition-all duration-200 max-w-[130px] md:max-w-none truncate
                ${
                  carouselIndex === idx
                    ? "bg-slate-900 border-transparent text-white shadow-sm font-black"
                    : "bg-white/40 text-slate-500 hover:text-slate-700 border border-slate-100"
                }
              `}
            >
              {itm.title}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
