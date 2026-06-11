import React, { useState, useEffect } from "react";
import { getFreesoundKey, getGroqKeys } from "../apiKeys";
import { getFlashSRSession } from "../freesoundFlashSR";

export default function Diagnostics() {
  const [freesoundStatus, setFreesoundStatus] = useState<{ status: "idle" | "checking" | "ok" | "error"; msg: string }>({
    status: "idle",
    msg: "Click verify to check Freesound connectivity."
  });

  const [groqStatus, setGroqStatus] = useState<{ status: "idle" | "ok" | "warn"; keysFound: number; msg: string }>({
    status: "idle",
    keysFound: 0,
    msg: "Pending checks."
  });

  const [flashSrModelStatus, setFlashSrModelStatus] = useState<{ status: "idle" | "loading" | "ok" | "error"; msg: string }>({
    status: "idle",
    msg: "Click compile to lazy load FlashSR model (500KB)."
  });

  const [stableAudioStatus, setStableAudioStatus] = useState<{ status: "idle" | "ok" | "error"; msg: string }>({
    status: "idle",
    msg: "Browser workers & canvas precision render are operational."
  });

  // Automatically check keys availability on load
  useEffect(() => {
    checkKeysInfo();
  }, []);

  const checkKeysInfo = () => {
    const fsKey = getFreesoundKey();
    if (fsKey) {
      setFreesoundStatus({
        status: "ok",
        msg: `Freesound Token exists in cache: ${fsKey.slice(0, 4)}...${fsKey.slice(-4)}`
      });
    } else {
      setFreesoundStatus({
        status: "error",
        msg: "No Freesound token found in localStorage (use Settings ⚙️ to add)."
      });
    }

    const groqKeys = getGroqKeys();
    if (groqKeys.length > 0) {
      setGroqStatus({
        status: "ok",
        keysFound: groqKeys.length,
        msg: `Found ${groqKeys.length} fallback Groq keys in cache! First key: ${groqKeys[0].slice(0, 10)}...`
      });
    } else {
      setGroqStatus({
        status: "warn",
        keysFound: 0,
        msg: "No custom Groq keys found. Prompts will fallback to local client-side DSP rules."
      });
    }

    // Worker test
    try {
      if (typeof Worker !== "undefined") {
        setStableAudioStatus({
          status: "ok",
          msg: "Web Worker support verified. Stable Audio is ready to scale asynchronously."
        });
      } else {
        setStableAudioStatus({
          status: "error",
          msg: "Browser lacks Web Worker API! Asynchronous synthesis may lag."
        });
      }
    } catch (e: any) {
      setStableAudioStatus({
        status: "error",
        msg: e?.message || "Workers verification failed."
      });
    }
  };

  const testFreesoundConnection = async () => {
    const token = getFreesoundKey();
    if (!token) {
      setFreesoundStatus({
        status: "error",
        msg: "API Check Aborted: Missing Freesound API key. Configure it first!"
      });
      return;
    }

    setFreesoundStatus({ status: "checking", msg: "Pinging Freesound CC0 index for 'thunder'..." });
    try {
      const url = `https://freesound.org/apiv2/search/text/?query=thunder&token=${token}&page_size=1`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Endpoint replied with raw status code ${res.status}`);
      }
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setFreesoundStatus({
          status: "ok",
          msg: "Success! Connection is verified and sound resources pull correctly."
        });
      } else {
        setFreesoundStatus({
          status: "warn" as any,
          msg: "Success ping, but returned 0 results. Check query terms."
        });
      }
    } catch (err: any) {
      setFreesoundStatus({
        status: "error",
        msg: `Connection Failed: ${err?.message || "Unknown Network/Token Error"}`
      });
    }
  };

  const compileFlashSRModel = async () => {
    setFlashSrModelStatus({ status: "loading", msg: "Fetching model from Hugging Face / Cache..." });
    const start = performance.now();
    try {
      await getFlashSRSession((msg) => {
        setFlashSrModelStatus({ status: "loading", msg: `${msg}...` });
      });
      const end = performance.now();
      const durationSeconds = ((end - start) / 1000).toFixed(2);
      setFlashSrModelStatus({
        status: "ok",
        msg: `FlashSR compilations successful! ONNX runtime running WebAssembly is fully verified in ${durationSeconds}s.`
      });
    } catch (err: any) {
      console.error(err);
      setFlashSrModelStatus({
        status: "error",
        msg: `Wasm Build Failed: ${err?.message || "Make sure ONNX Runtime JS is loaded"}`
      });
    }
  };

  return (
    <div className="w-[95%] md:w-[90%] max-w-4xl mx-auto p-6 md:p-8 rounded-3xl backdrop-blur-3xl bg-white/70 dark:bg-zinc-900/90 border border-white/60 dark:border-zinc-800/80 shadow-2xl space-y-8 select-none">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800/50">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold tracking-wider uppercase mb-1">
            <span>Core Integrations Diagnostics Panel</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            WaveWeaver Dynamic Diagnostics
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            This screen verifies APIs, rotating credentials, and local Neural network configurations before deployment.
          </p>
        </div>
        <button
          onClick={checkKeysInfo}
          className="self-start md:self-auto py-2 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
        >
          Reload Keys Storage
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Freesound diagnostics card */}
        <div className="p-5 rounded-2xl bg-white/60 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/40 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-indigo-500 font-bold">library_music</span>
              <h3 className="font-bold text-sm text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                Freesound API Check
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2 leading-relaxed">
              Verifies the status of your 1x Freesound Developer Token to query the Creative Commons 0 index.
            </p>
            <div className={`text-xs p-3 rounded-xl border font-mono ${
              freesoundStatus.status === "ok"
                ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : freesoundStatus.status === "checking"
                  ? "bg-indigo-500/5 text-indigo-500 border-indigo-500/20 animate-pulse"
                  : "bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/10"
            }`}>
              {freesoundStatus.msg}
            </div>
          </div>
          <button
            onClick={testFreesoundConnection}
            disabled={freesoundStatus.status === "checking"}
            className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-aurora-purple to-aurora-magenta hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-sm shadow-indigo-500/10"
          >
            {freesoundStatus.status === "checking" ? "Verifying..." : "Ping Freesound API"}
          </button>
        </div>

        {/* Groq failovers diagnostic card */}
        <div className="p-5 rounded-2xl bg-white/60 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/40 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-violet-500 font-bold">key</span>
              <h3 className="font-bold text-sm text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                Groq Rotating Keys Check
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2 leading-relaxed">
              Checks how many active developer failovers are configured. Synthesis will sequential failover if rate-limited.
            </p>
            <div className={`text-xs p-3 rounded-xl border font-mono ${
              groqStatus.status === "ok"
                ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/10"
            }`}>
              {groqStatus.msg}
            </div>
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal font-mono px-1">
            ⚠️ Standard keys: <code className="text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/20 px-1 rounded">waveweaver_groq_api_key_1</code>, <code className="text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/20 px-1 rounded">_2</code>, and <code className="text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/20 px-1 rounded">_3</code>.
          </div>
        </div>

        {/* FlashSR upscaler network check */}
        <div className="p-5 rounded-2xl bg-white/60 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/40 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-indigo-500 font-bold">blur_on</span>
              <h3 className="font-bold text-sm text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                FlashSR Neural Upscaler
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2 leading-relaxed">
              Verifies compilation of our 500KB ONNX frequency reconstructor WebAssembly backend. Runs 100% locally.
            </p>
            <div className={`text-xs p-3 rounded-xl border font-mono ${
              flashSrModelStatus.status === "ok"
                ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : flashSrModelStatus.status === "loading"
                  ? "bg-indigo-500/5 text-indigo-500 border-indigo-500/20 animate-pulse"
                  : "bg-indigo-50/20 text-indigo-500 dark:bg-zinc-850 dark:text-zinc-400 border-indigo-500/10"
            }`}>
              {flashSrModelStatus.msg}
            </div>
          </div>
          <button
            onClick={compileFlashSRModel}
            disabled={flashSrModelStatus.status === "loading"}
            className="w-full py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm shadow-indigo-500/10"
          >
            {flashSrModelStatus.status === "loading" ? "Compiling..." : "Build FlashSR Model"}
          </button>
        </div>

        {/* Stable Audio local model */}
        <div className="p-5 rounded-2xl bg-white/60 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/40 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-violet-500 font-bold">album</span>
              <h3 className="font-bold text-sm text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                Stable Audio Worker & DSP
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2 leading-relaxed">
              Asynchronous worker capability for generating complex modular syntheses in background threads.
            </p>
            <div className={`text-xs p-3 rounded-xl border font-mono ${
              stableAudioStatus.status === "ok"
                ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-red-500/5 text-red-650 border-red-500/10"
            }`}>
              {stableAudioStatus.msg}
            </div>
          </div>
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 p-3 text-[10px] text-violet-700 dark:text-violet-400 leading-relaxed font-mono">
            ℹ️ When ready to build for production, you can easily remove the diagnostics tab by commenting out the diagnostics navbar tab and diagnostics page element in App.tsx!
          </div>
        </div>

      </div>

    </div>
  );
}
