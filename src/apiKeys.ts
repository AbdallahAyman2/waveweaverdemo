/**
 * WaveWeaver API Key Management Utility
 * Saves and retrieves Freesound and Groq API keys dynamically from localStorage.
 */

export function getFreesoundKey(): string {
  const localVal = localStorage.getItem("waveweaver_freesound_api_key");
  if (localVal && localVal.trim() !== "") {
    return localVal.trim();
  }
  // Optional environment fallback if present, otherwise empty string
  const envVal = (import.meta as any).env?.VITE_FREESOUND_API_KEY;
  if (envVal && envVal.trim() !== "" && envVal !== "YOUR_FREESOUND_API_KEY") {
    return envVal.trim();
  }
  return "";
}

export function getFreepikKey(): string {
  const localVal = localStorage.getItem("waveweaver_freepik_api_key");
  if (localVal && localVal.trim() !== "") {
    return localVal.trim();
  }
  // Optional environment fallback if present, otherwise empty string
  const envVal = (import.meta as any).env?.VITE_FREEPIK_API_KEY;
  if (envVal && envVal.trim() !== "" && envVal !== "YOUR_FREEPIK_API_KEY") {
    return envVal.trim();
  }
  return "";
}

export function getGroqKeys(): string[] {
  const keys: string[] = [];
  
  const key1 = localStorage.getItem("waveweaver_groq_api_key_1");
  const key2 = localStorage.getItem("waveweaver_groq_api_key_2");
  const key3 = localStorage.getItem("waveweaver_groq_api_key_3");

  if (key1 && key1.trim() !== "") keys.push(key1.trim());
  if (key2 && key2.trim() !== "") keys.push(key2.trim());
  if (key3 && key3.trim() !== "") keys.push(key3.trim());

  // Return the user-configured keys if any are set
  if (keys.length > 0) {
    return keys;
  }

  // Fallback to environment keys if none are stored locally
  const envKeys = [
    (import.meta as any).env?.VITE_GROQ_API_KEY_1,
    (import.meta as any).env?.VITE_GROQ_API_KEY_2,
    (import.meta as any).env?.VITE_GROQ_API_KEY_3
  ];

  const validEnvKeys = envKeys.filter(
    (k): k is string =>
      !!k &&
      typeof k === "string" &&
      k.trim() !== "" &&
      !k.includes("YOUR_GROQ_API_KEY")
  );

  return validEnvKeys;
}
