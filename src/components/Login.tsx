import React, { useState } from "react";
import logoUrl from "../Untitled design.png";

interface LoginProps {
  onLoginSuccess: (email: string) => void;
  theme?: "light" | "dark";
}

export default function Login({ onLoginSuccess, theme = "light" }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Please enter both email and password parameters.");
      return;
    }

    setIsLoading(true);
    // Simulate real high-speed API verification
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(email);
    }, 850);
  };

  return (
    <div className="w-full max-w-md mx-auto py-16 px-4 select-none">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-[32px] shadow-2xl p-8 md:p-10 transition-all duration-300 relative overflow-hidden">
        
        {/* Glow corner effects */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-2xl flex-shrink-0 pointer-events-none" />
        
        <div className="text-center mb-8 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-white/60 border border-white/80 overflow-hidden flex items-center justify-center mx-auto shadow-sm mb-3">
            <img
              src={logoUrl}
              alt="WaveWeaver Logo"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const sib = e.currentTarget.nextElementSibling as HTMLElement;
                if (sib) sib.style.display = 'flex';
              }}
              className={`w-16 h-16 object-contain transition-all duration-300 ${
                theme === "dark" ? "grayscale contrast-125 brightness-110" : ""
              }`}
              referrerPolicy="no-referrer"
            />
            <span className="material-symbols-outlined text-4xl font-bold text-indigo-600 hidden">blur_on</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {isSignUp ? "Create Weaver Account" : "Access Wave Studio"}
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1 select-none leading-relaxed">
            {isSignUp
              ? "Synthesize high-fidelity cinema waveforms instantly"
              : "Sign in with any mock credentials to test persistent memory"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {isSignUp && (
            <div className="space-y-1.5">
              <label htmlFor="name-input" className="text-xs font-mono font-semibold tracking-wider text-slate-500 uppercase">
                Producer Name
              </label>
              <input
                id="name-input"
                type="text"
                placeholder="e.g. Trent Reznor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-white/80 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none hover:bg-white/60 focus:bg-white/90 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all duration-200 text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email-input" className="text-xs font-mono font-semibold tracking-wider text-slate-500 uppercase">
              Workspace Email
            </label>
            <input
              id="email-input"
              type="email"
              placeholder="producer@waveweaver.io"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-white/80 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none hover:bg-white/60 focus:bg-white/90 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all duration-200 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password-input" className="text-xs font-mono font-semibold tracking-wider text-slate-500 uppercase">
              Access Password
            </label>
            <input
              id="password-input"
              type="password"
              placeholder="••••••••"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-white/80 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none hover:bg-white/60 focus:bg-white/90 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all duration-200 font-mono text-sm"
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-aurora-purple to-aurora-magenta text-white font-bold rounded-2xl shadow-lg hover:brightness-110 hover:-translate-y-0.5 cursor-pointer select-none transform active:scale-95 transition-all mt-6 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">
                  progress_activity
                </span>
                <span>Authorizing workspace...</span>
              </>
            ) : (
              <span>{isSignUp ? "Sign Up & Access Studio" : "Sign In to Studio"}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs md:text-sm text-slate-500 relative z-10 pb-2">
          {isSignUp ? (
            <p>
              Already a studio member?{" "}
              <button
                id="toggle-login-btn"
                onClick={() => setIsSignUp(false)}
                className="text-indigo-600 font-bold hover:underline cursor-pointer focus:outline-none"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New to WaveWeaver?{" "}
              <button
                id="toggle-signup-btn"
                onClick={() => setIsSignUp(true)}
                className="text-indigo-600 font-bold hover:underline cursor-pointer focus:outline-none"
              >
                Create Account
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
