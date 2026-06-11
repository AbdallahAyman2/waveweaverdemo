import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, SoundHistoryItem } from "./types";
import AuroraBackground from "./components/AuroraBackground";
import GeneratorCard from "./components/GeneratorCard";
import SoundBubbles from "./components/SoundBubbles";
import Pricing from "./components/Pricing";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Diagnostics from "./components/Diagnostics";
import SettingsModal from "./components/SettingsModal";
import { weaveSound } from "./audioEngine";
import logoUrl from "./Untitled design.png";

// Defaults seeding constants
const DEFAULT_USER: UserProfile = {
  email: "darklightgamer33@gmail.com",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120",
  credits: 10,
  loggedIn: false
};

const SEED_HISTORY: SoundHistoryItem[] = [
  {
    id: "seed-1",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), // 4h ago
    prompt: "heavy lightning strike and crackling thunder rumble",
    duration: 5.5,
    influence: 85,
    soundType: "Deep Thunder Rumble",
    audioUrl: "" // Will be runtime synthesized if played, let's keep it safe
  }
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "dashboard" | "pricing" | "login" | "diagnostics">("home");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [history, setHistory] = useState<SoundHistoryItem[]>([]);
  const [currentTier, setCurrentTier] = useState("Free");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("waveweaver_theme");
      return (saved as "light" | "dark") || "light";
    } catch (e) {
      return "light";
    }
  });

  useEffect(() => {
    try {
      if (theme === "dark") {
        document.body.classList.add("dark-mode");
      } else {
        document.body.classList.remove("dark-mode");
      }
      localStorage.setItem("waveweaver_theme", theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  // Load persistent configurations from localStorage on initialization
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("waveweaver_user");
      const storedHistory = localStorage.getItem("waveweaver_history");
      const storedTier = localStorage.getItem("waveweaver_tier");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        localStorage.setItem("waveweaver_user", JSON.stringify(DEFAULT_USER));
      }

      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      } else {
        // Preset seed to make dashboard look fantastic from day 1
        // We will generate a real audio preview data for the seed item so it functions
        const loadSeed = async () => {
          try {
            const res = await weaveSound(SEED_HISTORY[0].prompt, SEED_HISTORY[0].duration, SEED_HISTORY[0].influence);
            const verifiedSeeds = [{ ...SEED_HISTORY[0], audioUrl: res.audioUrl }];
            setHistory(verifiedSeeds);
            localStorage.setItem("waveweaver_history", JSON.stringify(verifiedSeeds));
          } catch (e) {
            console.error("Could not compile seed catalog", e);
          }
        };
        loadSeed();
      }

      if (storedTier) {
        setCurrentTier(storedTier);
      } else {
        localStorage.setItem("waveweaver_tier", "Free");
      }
    } catch (e) {
      console.error("Local storage sync error", e);
    }
  }, []);

  const saveUserToCache = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    localStorage.setItem("waveweaver_user", JSON.stringify(updatedUser));
  };

  const handleConsumeCredit = (): boolean => {
    if (user.credits <= 0) return false;
    const nextUser = { ...user, credits: user.credits - 1 };
    saveUserToCache(nextUser);
    return true;
  };

  const handleAddHistory = (item: {
    prompt: string;
    duration: number;
    influence: number;
    soundType: string;
    audioUrl: string;
  }) => {
    const newItem: SoundHistoryItem = {
      id: `wave-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      prompt: item.prompt,
      duration: item.duration,
      influence: item.influence,
      soundType: item.soundType,
      audioUrl: item.audioUrl
    };

    const nextHistory = [newItem, ...history];
    setHistory(nextHistory);
    localStorage.setItem("waveweaver_history", JSON.stringify(nextHistory));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.setItem("waveweaver_history", JSON.stringify([]));
  };

  const handleRemoveHistoryItem = (id: string) => {
    const nextHistory = history.filter((item) => item.id !== id);
    setHistory(nextHistory);
    localStorage.setItem("waveweaver_history", JSON.stringify(nextHistory));
  };

  const handleLoginSuccess = (email: string) => {
    const nextUser = {
      ...user,
      email,
      loggedIn: true,
      avatar: `https://images.unsplash.com/photo-${1535713875000 + Math.floor(Math.random() * 9999)}?auto=format&fit=crop&q=80&w=120`
    };
    saveUserToCache(nextUser);
    setCurrentPage("home");
  };

  const handleLogout = () => {
    const nextUser = {
      ...user,
      loggedIn: false
    };
    saveUserToCache(nextUser);
    setCurrentPage("home");
  };

  const handleChangeEmail = (newEmail: string) => {
    const nextUser = { ...user, email: newEmail };
    saveUserToCache(nextUser);
  };

  const handleSubscribe = (tierName: string, credits: number | "Unlimited") => {
    // Add transaction values
    const currentCredits = user.credits;
    const addedCredits = credits === "Unlimited" ? 9999 : credits;
    
    const nextUser = {
      ...user,
      credits: currentCredits + addedCredits
    };
    
    saveUserToCache(nextUser);
    setCurrentTier(tierName);
    localStorage.setItem("waveweaver_tier", tierName);
    
    alert(`Subscribed successfully to "${tierName}"! We added standard credits to your studio balance.`);
    setCurrentPage("dashboard");
  };

  const handleRemixPreset = (promptText: string, durationVal: number, influenceVal: number) => {
    setCurrentPage("home");
    // Dispatch unified loader event to populate cards reactively
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("waveweaver-load-prompt", {
          detail: { prompt: promptText, duration: durationVal, influence: influenceVal }
        })
      );
    }, 150);
  };

  // Play synthesized bubble preset directly
  const handlePlayPreset = async (prompt: string, category: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const result = await weaveSound(prompt, 1.8, 70);
      
      const arrayBuffer = await fetch(result.audioUrl).then((r) => r.arrayBuffer());
      const buffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(0);

      // Register preset play in history too! This is super cool!
      handleAddHistory({
        prompt: `Preset preview audition: "${prompt}"`,
        duration: 1.8,
        influence: 70,
        soundType: result.soundType,
        audioUrl: result.audioUrl
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Precision animated backdrop aurora canvas */}
      <AuroraBackground theme={theme} />

      {/* Primary Orchestrated Navigation Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/30 border-b border-white/45 px-6 md:px-12 h-16 md:h-20 flex items-center justify-between select-none shadow-sm">
        
        {/* Logo Brand Brand */}
        <button
          id="nav-logo-btn"
          onClick={() => setCurrentPage("home")}
          className="flex items-center gap-3 text-slate-900 font-extrabold text-xl md:text-2xl tracking-tight cursor-pointer focus:outline-none hover:scale-102 transition-transform duration-200"
        >
          <img
            src={logoUrl}
            alt="WaveWeaver Logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const sib = e.currentTarget.nextElementSibling as HTMLElement;
              if (sib) sib.style.display = 'flex';
            }}
            className={`w-14 h-14 object-contain rounded-xl transition-all duration-300 ${
              theme === "dark" ? "grayscale contrast-125 brightness-110" : ""
            }`}
            referrerPolicy="no-referrer"
          />
          <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-aurora-purple via-indigo-600 to-aurora-magenta hidden items-center justify-center text-white shadow-md shadow-indigo-500/10">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 12c0-4 3-8 8-8s8 4 8 8-3 8-8 8-8-4-8-8z" strokeOpacity="0.3" />
              <path d="M12 2v20M17 5v14M7 5v14M22 9v6M2 9v6" strokeLinecap="round" />
            </svg>
          </div>
          <span>WaveWeaver</span>
        </button>

        {/* Navigation link triggers */}
        <nav className="flex items-center gap-2 md:gap-4 font-bold text-sm md:text-base">
          <button
            id="nav-home-link"
            onClick={() => setCurrentPage("home")}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer ${
              currentPage === "home"
                ? "bg-white/60 border-white/80 text-indigo-700 shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/25 hover:border-white/40"
            }`}
          >
            Studio
          </button>

          <button
            id="nav-dashboard-link"
            onClick={() => {
              if (!user.loggedIn) {
                setCurrentPage("login");
              } else {
                setCurrentPage("dashboard");
              }
            }}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer ${
              currentPage === "dashboard"
                ? "bg-white/60 border-white/80 text-indigo-700 shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/25 hover:border-white/40"
            }`}
          >
            Dashboard
          </button>

          <button
            id="nav-pricing-link"
            onClick={() => setCurrentPage("pricing")}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer ${
              currentPage === "pricing"
                ? "bg-white/60 border-white/80 text-indigo-700 shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/25 hover:border-white/40"
            }`}
          >
            Pricing
          </button>

          <button
            id="nav-diagnostics-link"
            onClick={() => setCurrentPage("diagnostics")}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer ${
              currentPage === "diagnostics"
                ? "bg-white/60 border-white/80 text-indigo-700 shadow-sm font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/25 hover:border-white/40 font-semibold"
            }`}
          >
            Diagnostics 🛡️
          </button>

          {/* Theme Switcher Toggle button */}
          <button
            id="theme-toggler-btn"
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            className="p-2 ml-1 rounded-xl border border-white/45 bg-white/20 dark:bg-purple-950/20 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-purple-900/40 hover:scale-105 active:scale-95 transition-all outline-none flex items-center justify-center cursor-pointer shadow-sm relative z-50 text-[18px]"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span 
              className="material-symbols-outlined text-[19px] md:text-[21px] select-none pointer-events-none transition-transform duration-500 ease-out"
              style={{ transform: theme === "dark" ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>

          {/* Configure Keys Settings button */}
          <button
            id="configure-keys-btn"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 ml-1 rounded-xl border border-white/45 bg-white/20 dark:bg-purple-950/20 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-purple-900/40 hover:scale-105 active:scale-95 transition-all outline-none flex items-center justify-center cursor-pointer shadow-sm relative z-50 text-[18px]"
            title="Configure API Keys"
          >
            <span className="material-symbols-outlined text-[19px] md:text-[21px] select-none pointer-events-none">
              settings
            </span>
          </button>

          {/* Profile badge / Login anchor toggling */}
          {user.loggedIn ? (
            <div className="flex items-center gap-2 pl-1.5 border-l border-white/40">
              <button
                id="nav-profile-trigger"
                onClick={() => setCurrentPage("dashboard")}
                className="flex items-center gap-1.5 hover:bg-white/20 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <img
                  src={user.avatar}
                  referrerPolicy="no-referrer"
                  alt="User"
                  className="w-7 h-7 rounded-full border border-white/80 shadow-sm"
                />
                <div className="hidden py-1 md:flex items-center gap-1 text-[11px] text-slate-600 bg-white/60 hover:bg-white/80 px-2 rounded-full font-mono border border-white/50 shadow-sm">
                  <span>{user.credits} CR</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
              </button>
            </div>
          ) : (
            <button
              id="nav-login-link"
              onClick={() => setCurrentPage("login")}
              className={`px-4 py-1.5 rounded-xl font-bold text-white shadow-md bg-gradient-to-r from-aurora-purple to-aurora-magenta hover:brightness-105 cursor-pointer transition-all active:scale-95 ${
                currentPage === "login" ? "ring-2 ring-indigo-200" : ""
              }`}
            >
              Sign In
            </button>
          )}
        </nav>

      </header>

      {/* Primary Dynamic Transitions Display Core */}
      <main className="flex-grow flex flex-col justify-center py-2 md:py-4 z-10 animate-fade-in">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="w-full relative"
          >
            {currentPage === "home" && (
              <section className="space-y-4">
                
                {/* Hero Headers */}
                <div className="text-center px-4 max-w-2xl mx-auto mb-3 reveal-on-scroll">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mt-2 tracking-tight">
                    Weave Sound from Words
                  </h1>
                  <p className="text-slate-500 text-xs md:text-sm mt-2 max-w-lg mx-auto font-medium leading-relaxed">
                    Generate production-ready cinematic sound effects using our high-fidelity custom synthesizer.
                  </p>
                </div>

                {/* Main Generator board card */}
                <GeneratorCard
                  userCredits={user.credits}
                  onConsumeCredit={handleConsumeCredit}
                  onAddHistory={handleAddHistory}
                  onGoToPricing={() => setCurrentPage("pricing")}
                />

                {/* Lower preset sound bubbles row */}
                <SoundBubbles onPlayPreset={handlePlayPreset} />

              </section>
            )}

            {currentPage === "dashboard" && (
              <Dashboard
                user={user}
                history={history}
                onClearHistory={handleClearHistory}
                onRemoveHistoryItem={handleRemoveHistoryItem}
                onLogout={handleLogout}
                onChangeEmail={handleChangeEmail}
                onRemixPreset={handleRemixPreset}
              />
            )}

            {currentPage === "pricing" && (
              <Pricing onSubscribe={handleSubscribe} currentTier={currentTier} />
            )}

            {currentPage === "login" && (
              <Login onLoginSuccess={handleLoginSuccess} theme={theme} />
            )}

            {currentPage === "diagnostics" && (
              <Diagnostics />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fully styled professional footer */}
      <footer className="w-[95%] md:w-[90%] max-w-6xl mx-auto my-6 rounded-[24px] backdrop-blur-xl bg-white/40 border border-white/60 shadow-md p-6 flex flex-col md:flex-row items-center justify-between gap-4 select-none z-10 text-slate-400 text-xs md:text-sm">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="WaveWeaver Logo"
            className={`w-10 h-10 object-contain rounded-lg transition-all duration-300 ${
              theme === "dark" ? "grayscale contrast-125 brightness-110" : ""
            }`}
            referrerPolicy="no-referrer"
          />
          <span className="font-semibold text-slate-600 font-mono text-xs">WaveWeaver © 2026</span>
        </div>
        <p className="text-slate-500 font-mono text-[10px] text-center md:text-right">
          Synthesized offline client-side inside Web Audio Context. All Rights Reserved.
        </p>
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(fKey, g1, g2, g3) => {
          localStorage.setItem("waveweaver_freesound_api_key", fKey);
          localStorage.setItem("waveweaver_groq_api_key_1", g1);
          localStorage.setItem("waveweaver_groq_api_key_2", g2);
          localStorage.setItem("waveweaver_groq_api_key_3", g3);
          setIsSettingsOpen(false);
          window.dispatchEvent(new CustomEvent("waveweaver_keys_updated"));
        }}
      />

    </div>
  );
}
