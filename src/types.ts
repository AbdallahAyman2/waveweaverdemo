export interface UserProfile {
  email: string;
  avatar: string;
  credits: number;
  loggedIn: boolean;
}

export interface SoundHistoryItem {
  id: string;
  timestamp: string;
  prompt: string;
  duration: number; // in seconds
  influence: number; // as percentage
  soundType: string; // e.g. "Footsteps", "Laser"
  audioUrl: string; // Base64 data-URI from generated Web Audio
  durationLabel?: string;
}

export interface SoundBubbleItem {
  label: string;
  emoji: string;
  soundType: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  credits: number | "Unlimited";
  features: string[];
  badge?: string;
  glow?: boolean;
}
