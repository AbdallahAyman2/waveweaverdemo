import React, { useState, useRef, useEffect } from "react";
import { SoundHistoryItem, UserProfile } from "../types";
import { formatTimeAgo, drawWaveform } from "../utils";

interface DashboardProps {
  user: UserProfile;
  history: SoundHistoryItem[];
  onClearHistory: () => void;
  onRemoveHistoryItem: (id: string) => void;
  onLogout: () => void;
  onChangeEmail: (newEmail: string) => void;
  onRemixPreset: (prompt: string, duration: number, influence: number) => void;
}

export default function Dashboard({
  user,
  history,
  onClearHistory,
  onRemoveHistoryItem,
  onLogout,
  onChangeEmail,
  onRemixPreset
}: DashboardProps) {
  const [viewMode, setViewMode] = useState<"list" | "bubble">("list");
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({});

  // Audio elements references
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const progressIntervalRef = useRef<number | null>(null);
  const canvasesRef = useRef<Record<string, HTMLCanvasElement | null>>({});

  const handleUpdateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      alert("Please provide a valid studio email address.");
      return;
    }
    onChangeEmail(newEmail.trim());
    setIsUpdatingEmail(false);
    setNewEmail("");
    alert("Studio email synchronized successfully.");
  };

  // Convert and play specific archived base64 wav files
  const playHistoryItem = async (item: SoundHistoryItem) => {
    if (playingId === item.id) {
      pauseHistoryItem();
      return;
    }

    // Stop current playbacks
    stopHistoryAudio();

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      const ctx = audioContextRef.current;
      setPlayingId(item.id);

      // Fetch array buffer from base64 base URI
      const response = await fetch(item.audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const offset = pausedAtRef.current;
      source.start(0, offset);

      activeSourceRef.current = source;
      playbackStartRef.current = ctx.currentTime - offset;

      const totalDuration = audioBuffer.duration;
      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = ctx.currentTime - playbackStartRef.current;
        if (elapsed >= totalDuration) {
          stopHistoryAudio();
        } else {
          setPlaybackProgress((prev) => ({
            ...prev,
            [item.id]: elapsed / totalDuration,
          }));
        }
      }, 50) as unknown as number;

      source.onended = () => {
        const elapsed = ctx.currentTime - playbackStartRef.current;
        if (elapsed >= totalDuration - 0.05) {
          stopHistoryAudio();
        }
      };

    } catch (e) {
      console.error(e);
      alert("Sound Weaver failed to decode local wave cache.");
      stopHistoryAudio();
    }
  };

  const pauseHistoryItem = () => {
    if (!playingId || !activeSourceRef.current || !audioContextRef.current) return;
    
    activeSourceRef.current.stop();
    activeSourceRef.current = null;

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    const elapsed = audioContextRef.current.currentTime - playbackStartRef.current;
    pausedAtRef.current = elapsed;
    setPlayingId(null);
  };

  const stopHistoryAudio = () => {
    if (activeSourceRef.current) {
      activeSourceRef.current.stop();
      activeSourceRef.current = null;
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    pausedAtRef.current = 0;
    setPlayingId(null);
  };

  // Re-draw canvases whenever progress or items re-order values change
  useEffect(() => {
    if (!audioContextRef.current) return;
    history.forEach(async (item) => {
      const canvas = canvasesRef.current[item.id];
      if (canvas) {
        try {
          const res = await fetch(item.audioUrl);
          const buf = await res.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(buf);
          drawWaveform(canvas, audioBuffer, playbackProgress[item.id] || 0);
        } catch (e) {
          // ignore concurrent rendering overlaps
        }
      }
    });
  }, [history, playbackProgress, viewMode]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 select-none">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: User profile metrics & configs */}
        <div className="space-y-6">
          <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-[24px] p-6 shadow-xl relative overflow-hidden">
            <h3 className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase mb-4">
              Active Channel Profile
            </h3>
            <div className="flex items-center gap-4 relative z-10">
              <img
                src={user.avatar}
                referrerPolicy="no-referrer"
                alt="User Avatar"
                className="w-16 h-16 rounded-full border border-white/80 object-cover shadow-md bg-gradient-to-tr from-slate-100 to-slate-200"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-extrabold text-slate-800 truncate">
                  {user.email.split("@")[0]}
                </h4>
                <p className="text-slate-500 text-xs md:text-sm truncate font-medium">
                  {user.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] bg-white/80 border border-white/60 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full uppercase font-mono shadow-sm">
                    Premium Account
                  </span>
                </div>
              </div>
            </div>

            {/* Credit details metrics */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/40 select-none relative z-10">
              <div className="bg-white/50 rounded-2xl p-3 border border-white/60 shadow-inner">
                <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase">
                  Available Credits
                </p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  {user.credits}
                </p>
              </div>
              <div className="bg-white/50 rounded-2xl p-3 border border-white/60 shadow-inner">
                <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase">
                  Weft Sessions
                </p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  {history.length}
                </p>
              </div>
            </div>
          </div>

          {/* Account adjustments widgets */}
          <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-[24px] p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">
              Control Panel Configuration
            </h3>

            {isUpdatingEmail ? (
              <form onSubmit={handleUpdateEmail} className="space-y-3">
                <input
                  type="email"
                  value={newEmail}
                  required
                  placeholder="Enter new email address"
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/80 bg-white/50 outline-none text-slate-800 focus:bg-white focus:border-indigo-400 font-mono text-xs md:text-sm"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold shadow hover:bg-slate-800 cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUpdatingEmail(false)}
                    className="py-1.5 px-3 rounded-lg border border-white bg-white/40 hover:bg-white text-slate-500 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                id="change-email-btn"
                onClick={() => setIsUpdatingEmail(true)}
                className="w-full py-3 px-4 rounded-xl border border-white bg-white/50 text-slate-700 font-semibold text-xs md:text-sm hover:bg-white/80 hover:border-indigo-150 shadow-sm transition-all text-center cursor-pointer select-none font-mono"
              >
                Configure Studio Email
              </button>
            )}

            <button
              id="clear-history-btn"
              onClick={onClearHistory}
              disabled={history.length === 0}
              className={`
                w-full py-3 px-4 rounded-xl border font-bold text-xs md:text-sm text-center cursor-pointer select-none transition-all shadow-sm
                ${
                  history.length === 0
                    ? "border-slate-250 bg-white/20 text-slate-300 cursor-not-allowed"
                    : "border-rose-200/60 bg-white/50 hover:bg-rose-50/50 text-rose-600 hover:border-rose-300 cursor-pointer"
                }
              `}
            >
              Clear Session Wave History
            </button>

            <button
              id="dashboard-logout-btn"
              onClick={onLogout}
              className="w-full py-3 px-4 rounded-xl bg-white/60 hover:bg-white border border-white/60 text-slate-600 font-semibold text-xs md:text-sm transition-all text-center cursor-pointer select-none"
            >
              Log Out of Workspace
            </button>
          </div>
        </div>

        {/* Right Side: Sound History logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-[32px] p-6 md:p-8 shadow-2xl">
            
            {/* Header controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/40">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">
                  Synthesized Soundwave Logs
                </h2>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-medium">
                  Archived compilation cache saved inside local session buffer
                </p>
              </div>

              {/* View Layout Toggle */}
              <div className="flex items-center gap-1.5 p-1 bg-white/40 border border-white/60 rounded-xl shadow-innerBack">
                <button
                  id="toggle-view-list"
                  onClick={() => setViewMode("list")}
                  className={`
                    p-1.5 rounded-lg cursor-pointer select-none transition-all flex items-center
                    ${
                      viewMode === "list"
                        ? "bg-white text-slate-800 shadow-sm border border-white/60"
                        : "text-slate-400 hover:text-slate-600"
                    }
                  `}
                  title="List layout configuration"
                >
                  <span className="material-symbols-outlined text-lg">view_list</span>
                </button>
                <button
                  id="toggle-view-bubble"
                  onClick={() => setViewMode("bubble")}
                  className={`
                    p-1.5 rounded-lg cursor-pointer select-none transition-all flex items-center
                    ${
                      viewMode === "bubble"
                        ? "bg-white text-slate-800 shadow-sm border border-white/60"
                        : "text-slate-400 hover:text-slate-600"
                    }
                  `}
                  title="Grid visual layout configuration"
                >
                  <span className="material-symbols-outlined text-lg">grid_view</span>
                </button>
              </div>
            </div>

            {/* Empty view state template */}
            {history.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-white/50 border border-white/60 shadow-sm flex items-center justify-center mx-auto text-slate-400 mb-4">
                  <span className="material-symbols-outlined text-3xl font-semibold">queue_music</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-800">No waves compiled yet</h3>
                <p className="text-slate-500 text-xs md:text-sm max-w-sm mx-auto mt-1 select-none">
                  Weave custom sounds in the home generator room. They will register inside this local folder.
                </p>
              </div>
            ) : (
              <div className={viewMode === "list" ? "divide-y divide-white/40" : "grid grid-cols-1 md:grid-cols-2 gap-4 pt-6"}>
                
                {history.map((item) => {
                  const isCurrentPlaying = playingId === item.id;
                  const itemProgress = playbackProgress[item.id] || 0;

                  return (
                    <div
                      key={item.id}
                      className={`
                        transition-all duration-300
                        ${
                          viewMode === "list"
                            ? "py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/30 px-3 rounded-2xl"
                            : "bg-white/30 border border-white/50 rounded-2xl p-4 flex flex-col justify-between hover:border-white hover:bg-white/65 hover:shadow-md transition-all duration-300"
                        }
                      `}
                    >
                      {/* Left: Wave particulars */}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-500 flex-shrink-0 border border-white/40">
                            <span className="material-symbols-outlined text-base">waves</span>
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs md:text-sm font-extrabold text-slate-800 truncate">
                              {item.soundType}
                            </h4>
                            <p className="text-[10px] font-mono font-medium text-slate-400">
                              {formatTimeAgo(item.timestamp)}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 italic line-clamp-2 pl-9 font-sans">
                          "{item.prompt}"
                        </p>

                        {/* Miniature waveform render track */}
                        <div className="pl-9 pr-2">
                          <canvas
                            ref={(el) => {
                              canvasesRef.current[item.id] = el;
                            }}
                            className="w-full h-8 block"
                          />
                        </div>
                      </div>

                      {/* Right: Controller nodes toggles */}
                      <div
                        className={`
                          flex items-center gap-2 flex-shrink-0
                          ${viewMode === "list" ? "pl-9 md:pl-0" : "mt-4 pt-3 border-t border-white/40 justify-between"}
                        `}
                      >
                        <div className="flex items-center gap-2 font-mono">
                          {/* Play/pause triggering */}
                          <button
                            onClick={() => playHistoryItem(item)}
                            className={`
                              p-2 rounded-full cursor-pointer transition-all active:scale-90 flex items-center justify-center shadow-sm border border-white/60
                              ${
                                isCurrentPlaying
                                  ? "bg-slate-900 text-white"
                                  : "bg-white/90 text-indigo-600 hover:text-indigo-700 hover:bg-white"
                              }
                            `}
                            title={isCurrentPlaying ? "Pause wave" : "Listen to wave"}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isCurrentPlaying ? "pause" : "play_arrow"}
                            </span>
                          </button>

                          {/* Remix triggers parameters */}
                          <button
                            onClick={() => onRemixPreset(item.prompt, item.duration, item.influence)}
                            className="p-2 rounded-full border border-white/80 bg-white/50 text-slate-400 hover:text-slate-600 hover:bg-white hover:border-indigo-200 cursor-pointer transition-all shadow-sm"
                            title="Refeed coefficients to main parameters"
                          >
                            <span className="material-symbols-outlined text-sm">tune</span>
                          </button>

                          {/* Trigger file saving */}
                          <a
                            href={item.audioUrl}
                            download={`archived_waveweaver_${item.id.slice(0,6)}.wav`}
                            className="p-2 rounded-full border border-white/80 bg-white/50 text-slate-400 hover:text-indigo-650 hover:bg-white hover:border-indigo-200 cursor-pointer transition-all shadow-sm"
                            title="Download pure WAV format"
                          >
                            <span className="material-symbols-outlined text-sm">download</span>
                          </a>
                        </div>

                        {/* Discard history record */}
                        <button
                          onClick={() => {
                            if (confirm("Permanently delete this wave representation from history cache?")) {
                              onRemoveHistoryItem(item.id);
                            }
                          }}
                          className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-white border border-transparent hover:border-rose-100 cursor-pointer transition-all shadow-sm"
                          title="Purge sound track"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>

                    </div>
                  );
                })}

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
