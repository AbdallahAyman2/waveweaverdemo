import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (freesoundKey: string, groq1: string, groq2: string, groq3: string) => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [freesoundKey, setFreesoundKey] = useState("");
  const [groq1, setGroq1] = useState("");
  const [groq2, setGroq2] = useState("");
  const [groq3, setGroq3] = useState("");

  // Load from localStorage on open
  useEffect(() => {
    if (isOpen) {
      setFreesoundKey(localStorage.getItem("waveweaver_freesound_api_key") || "");
      setGroq1(localStorage.getItem("waveweaver_groq_api_key_1") || "");
      setGroq2(localStorage.getItem("waveweaver_groq_api_key_2") || "");
      setGroq3(localStorage.getItem("waveweaver_groq_api_key_3") || "");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(freesoundKey, groq1, groq2, groq3);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="settings-modal bg-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop dynamic blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white/95 dark:bg-zinc-900/95 border border-white/40 dark:border-zinc-800/80 shadow-2xl backdrop-blur-2xl p-6 md:p-8"
          >
            {/* Background Accent Gradients */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-gradient-to-br from-aurora-purple/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-gradient-to-tr from-aurora-magenta/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <span className="material-symbols-outlined text-xl font-bold animate-spin-slow">settings</span>
                </div>
                <div>
                  <h3 id="settings-title" className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    API Credentials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Keys are stored securely in your browser's local cache
                  </p>
                </div>
              </div>
              <button
                id="close-settings-btn"
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-slate-200/60 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg leading-none">close</span>
              </button>
            </div>

            {/* Keys Input Form */}
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              {/* Freesound Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Freesound API Key
                </label>
                <div className="relative">
                  <input
                    id="freesound-key-input"
                    type="password"
                    autoComplete="off"
                    value={freesoundKey}
                    onChange={(e) => setFreesoundKey(e.target.value)}
                    placeholder="Enter Freesound Token (freesound.org/apiv2/apply)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/50 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-xs font-mono"
                  />
                  {freesoundKey && (
                    <button
                      type="button"
                      onClick={() => setFreesoundKey("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                  Allows authenticating calls directly against the Freesound search index.
                </p>
              </div>

              {/* Llama-3 (Groq API Keys) */}
              <div className="space-y-3 pt-2">
                <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-300">
                    Groq LLM API Keys (Rotating Failovers)
                  </label>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mb-3">
                    Configuring multiple keys enables automatic sequential request failovers.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-indigo-500 w-5">#1</span>
                    <input
                      id="groq-key-1"
                      type="password"
                      autoComplete="off"
                      value={groq1}
                      onChange={(e) => setGroq1(e.target.value)}
                      placeholder="gsk_..."
                      className="flex-grow px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-indigo-500 w-5">#2</span>
                    <input
                      id="groq-key-2"
                      type="password"
                      autoComplete="off"
                      value={groq2}
                      onChange={(e) => setGroq2(e.target.value)}
                      placeholder="Secondary Failover Key (Optional)"
                      className="flex-grow px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-indigo-500 w-5">#3</span>
                    <input
                      id="groq-key-3"
                      type="password"
                      autoComplete="off"
                      value={groq3}
                      onChange={(e) => setGroq3(e.target.value)}
                      placeholder="Tertiary Failover Key (Optional)"
                      className="flex-grow px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Note banner */}
              <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30 p-3 text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-mono">
                💡 Missing keys? Weaving automatically uses semantic, client-side, local heuristic fallbacks combined with the local worker-based synth engines!
              </div>

              {/* Submit / Action Group */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="cancel-settings-btn"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 font-bold text-xs text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-settings-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/20 font-bold text-xs text-white shadow-md shadow-indigo-500/15 cursor-pointer transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
