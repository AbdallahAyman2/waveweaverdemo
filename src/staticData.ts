import { SoundBubbleItem, PricingTier } from "./types";

export const SOUND_BUBBLES: SoundBubbleItem[] = [
  { label: "Rain Showers", emoji: "🌧️", soundType: "rain" },
  { label: "Tactile Steps", emoji: "👟", soundType: "footsteps" },
  { label: "Warm Applause", emoji: "👏", soundType: "applause" },
  { label: "Deep Thunder", emoji: "⚡", soundType: "thunder" },
  { label: "Retro Coin", emoji: "👾", soundType: "coin" },
  { label: "Earsome Wind", emoji: "🍃", soundType: "nature" },
  { label: "Cyber Heart", emoji: "🤖", soundType: "robotic" },
  { label: "Laser Charge", emoji: "✨", soundType: "scifi" }
];

export const SUGGESTED_PROMPTS = [
  "distant heavy thunder rolling across deep valleys",
  "footsteps running on wet grass in a rainy forest",
  "retro video game coin jump chime collection sound",
  "cybernetic pulse inside a deep mainframe circuit",
  "laser beam weapon charging with dynamic frequency sweep"
];

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Base Weaver",
    price: "$0",
    credits: 10,
    features: [
      "10 free sound generations per month",
      "Full Web Audio synthesizer synthesis",
      "Dynamic 16-bit WAV file exports",
      "Local storage history persistence"
    ],
    badge: "Starter"
  },
  {
    id: "pro",
    name: "Audio Pro",
    price: "$9",
    credits: 500,
    features: [
      "500 sound generations per month",
      "Prioritized sound rendering pipeline",
      "Unlimited history & exports",
      "Early access to creative modulators"
    ],
    badge: "Most Popular",
    glow: true
  },
  {
    id: "studio",
    name: "Studio Weaver",
    price: "$29",
    credits: "Unlimited",
    features: [
      "Unlimited sound effect weaving",
      "Highest resolution rendering buffers",
      "Commercial distribution license",
      "Dedicated synth channel custom profiles"
    ],
    badge: "Enterprise"
  }
];
