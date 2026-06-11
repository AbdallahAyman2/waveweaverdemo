import React from "react";
import { PRICING_TIERS } from "../staticData";

interface PricingProps {
  onSubscribe: (tierName: string, credits: number | "Unlimited") => void;
  currentTier: string;
}

export default function Pricing({ onSubscribe, currentTier }: PricingProps) {
  return (
    <div className="w-full max-w-5xl mx-auto py-16 px-4 select-none">
      <div className="text-center mb-12 reveal-on-scroll">
        <h3 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
          Subscription Channels
        </h3>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mt-2 tracking-tight">
          Flexible Channels, Precision Engineering
        </h2>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm md:text-base">
          Unlock high-speed offline canvas rendering and limitless multi-channel downloads. No contracts. Adjust your synthesis capabilities instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 items-stretch">
        {PRICING_TIERS.map((tier) => {
          const isSelected = currentTier.toLowerCase() === tier.id;
          return (
            <div
              key={tier.id}
              id={`pricing-card-${tier.id}`}
              className={`
                relative flex flex-col justify-between rounded-[32px] p-8 backdrop-blur-xl bg-white/40 border border-white/60 shadow-xl transition-all duration-300
                ${
                  tier.glow
                    ? "ring-2 ring-pink-300/45 translate-y-[-8px] shadow-2xl bg-white/55 border-white/90"
                    : "hover:translate-y-[-4px] hover:shadow-2xl hover:bg-white/50"
                }
              `}
            >
              {/* Hot-badge label */}
              {tier.badge && (
                <span
                  className={`
                    absolute top-5 right-5 text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full
                    ${
                      tier.glow
                        ? "bg-gradient-to-r from-pink-500 to-indigo-600 text-white shadow"
                        : "bg-white/80 text-slate-500 border border-white/60 shadow-sm"
                    }
                  `}
                >
                  {tier.badge}
                </span>
              )}

              {/* Card Contents */}
              <div>
                <h4 className="text-lg font-extrabold text-slate-800 select-none">
                  {tier.name}
                </h4>
                
                {/* Cost metrics */}
                <div className="flex items-baseline mt-4 select-none">
                  <span className="text-4xl md:text-5xl font-black text-slate-950 tracking-tight">
                    {tier.price}
                  </span>
                  <span className="text-slate-500 text-sm ml-2 font-medium">/ month</span>
                </div>

                <p className="text-indigo-600 text-xs md:text-sm mt-3 font-mono font-semibold">
                  {tier.credits === "Unlimited"
                    ? "💫 Limitless pipeline memory buffer"
                    : `💸 Instantly adds ${tier.credits} weaving credits`}
                </p>

                {/* Feature checklist */}
                <ul className="mt-8 space-y-3.5 text-xs md:text-sm">
                  {tier.features.map((feat, fidx) => (
                    <li key={fidx} className="flex items-start gap-2.5 text-slate-600">
                      <span className="material-symbols-outlined text-emerald-500 text-lg flex-shrink-0 font-semibold">
                        check_circle
                      </span>
                      <span className="font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Call to action element */}
              <div className="mt-8">
                <button
                  id={`subscribe-btn-${tier.id}`}
                  onClick={() => onSubscribe(tier.name, tier.credits)}
                  className={`
                    w-full py-3.5 rounded-2xl text-center font-bold text-sm select-none cursor-pointer transition-all duration-200 active:scale-95 shadow-sm
                    ${
                      isSelected
                        ? "bg-white/50 text-slate-400 border border-white/60 cursor-default"
                        : tier.glow
                        ? "bg-gradient-to-r from-aurora-purple to-aurora-magenta text-white shadow-md hover:brightness-110"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }
                  `}
                >
                  {isSelected ? "Current Plan Active" : `Select ${tier.name}`}
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
