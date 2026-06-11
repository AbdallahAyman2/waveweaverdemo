import { getGroqKeys } from "./apiKeys";

export interface SoundParameters {
  searchQuery: string;
  tiksType: 'click' | 'pop' | 'success' | 'notify';
  toneforgeRecipe: 'laser' | 'explosion' | 'powerup' | 'jump' | 'coin';
  originalPrompt: string;
}

export function fallbackRegexParser(prompt: string): SoundParameters {
  const normalized = prompt.toLowerCase();
  
  // 1. Determine tiksType
  let tiksType: 'click' | 'pop' | 'success' | 'notify' = 'click';
  if (
    normalized.includes('success') || 
    normalized.includes('win') || 
    normalized.includes('complete') || 
    normalized.includes('achieve') || 
    normalized.includes('done') || 
    normalized.includes('finish') ||
    normalized.includes('tada') ||
    normalized.includes('correct')
  ) {
    tiksType = 'success';
  } else if (
    normalized.includes('notify') || 
    normalized.includes('alert') || 
    normalized.includes('bell') || 
    normalized.includes('message') || 
    normalized.includes('beep') || 
    normalized.includes('warn') ||
    normalized.includes('ring') ||
    normalized.includes('attention')
  ) {
    tiksType = 'notify';
  } else if (
    normalized.includes('pop') || 
    normalized.includes('bubble') || 
    normalized.includes('balloon') || 
    normalized.includes('soft') || 
    normalized.includes('burst') ||
    normalized.includes('water')
  ) {
    tiksType = 'pop';
  } else {
    tiksType = 'click';
  }

  // 2. Determine toneforgeRecipe
  let toneforgeRecipe: 'laser' | 'explosion' | 'powerup' | 'jump' | 'coin' = 'laser';
  if (
    normalized.includes('coin') || 
    normalized.includes('gold') || 
    normalized.includes('money') || 
    normalized.includes('collect') || 
    normalized.includes('score') || 
    normalized.includes('point') ||
    normalized.includes('ring') ||
    normalized.includes('gem')
  ) {
    toneforgeRecipe = 'coin';
  } else if (
    normalized.includes('explosion') || 
    normalized.includes('boom') || 
    normalized.includes('blast') || 
    normalized.includes('detonate') || 
    normalized.includes('bomb') || 
    normalized.includes('destroy') || 
    normalized.includes('fire') ||
    normalized.includes('thunder')
  ) {
    toneforgeRecipe = 'explosion';
  } else if (
    normalized.includes('powerup') || 
    normalized.includes('level') || 
    normalized.includes('super') || 
    normalized.includes('boost') || 
    normalized.includes('shield') || 
    normalized.includes('charge') ||
    normalized.includes('grow')
  ) {
    toneforgeRecipe = 'powerup';
  } else if (
    normalized.includes('jump') || 
    normalized.includes('bounce') || 
    normalized.includes('spring') || 
    normalized.includes('vault') || 
    normalized.includes('leap') ||
    normalized.includes('hop')
  ) {
    toneforgeRecipe = 'jump';
  } else {
    toneforgeRecipe = 'laser';
  }

  // 3. Determine searchQuery
  // Make it a clean, descriptive search querying suitable for audio library
  let searchQuery = prompt.trim();
  // Remove starting fillers
  searchQuery = searchQuery.replace(/^(make|create|generate|search|find|give me|produce)\s+(a|an|some)?\s*/i, '');
  
  return {
    searchQuery: searchQuery || "sci-fi sound effect",
    tiksType,
    toneforgeRecipe,
    originalPrompt: prompt
  };
}

export async function extractSoundParameters(
  prompt: string,
  onProgress?: (message: string) => void
): Promise<SoundParameters> {
  const keys = getGroqKeys();

  // 1. Try Groq API Keys in sequence
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      onProgress?.(`Trying Groq LLM (Key ${i + 1}/${keys.length})...`);
      const response = await fetch("https://api.groq.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a professional audio search and synthesis parameter designer. Translate user prompts into specific instructions for 3 synthesizers.
Return ONLY a valid JSON object matching this schema:
{
  "searchQuery": "descriptive audio search query for external sfx library (e.g. 'heavy rain thunder rumble', 'robotic voice glitch')",
  "tiksType": "one of: 'click', 'pop', 'success', 'notify'",
  "toneforgeRecipe": "one of: 'laser', 'explosion', 'powerup', 'jump', 'coin'",
  "originalPrompt": "the original user prompt"
}`
            },
            {
              role: "user",
              content: `Translate this prompt: "${prompt}"`
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const contentStr = data.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          // Sanitize & validate values
          const tiksTypeValues = ['click', 'pop', 'success', 'notify'];
          const toneforgeRecipeValues = ['laser', 'explosion', 'powerup', 'jump', 'coin'];

          const tiksType = tiksTypeValues.includes(parsed.tiksType) ? parsed.tiksType : 'click';
          const toneforgeRecipe = toneforgeRecipeValues.includes(parsed.toneforgeRecipe) ? parsed.toneforgeRecipe : 'laser';
          const searchQuery = parsed.searchQuery || prompt;

          onProgress?.(`Groq synthesis parsed successfully!`);
          return {
            searchQuery,
            tiksType,
            toneforgeRecipe,
            originalPrompt: prompt
          };
        }
      } else {
        console.warn(`Groq Key ${i + 1} request failed: Status ${response.status}`);
      }
    } catch (e) {
      console.warn(`Groq Key ${i + 1} connection failed:`, e);
    }
  }

  // 2. Failover to local LLM with transformers.js
  try {
    onProgress?.("Groq unavailable. Loading local transformers.js Llama-3.2-3B...");
    // Import pipeline dynamically bypassing TS build-time lookup checks
    const loadModule = new Function("url", "return import(url)");
    const transformers = await loadModule(
      'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-beta.5/dist/transformers.min.js'
    );

    onProgress?.("Constructing Llama pipeline (Xenova/llama-3.2-3b-instruct)...");
    const generator = await transformers.pipeline('text-generation', 'Xenova/llama-3.2-3b-instruct', {
      progress_callback: (info: any) => {
        if (info.status === 'downloading') {
          const progressPercent = Math.round(info.progress || 0);
          onProgress?.(`Loading local model file: ${info.file ? info.file.split('/').pop() : ''} (${progressPercent}%)`);
        } else if (info.status === 'done') {
          onProgress?.(`Loaded model asset: ${info.file ? info.file.split('/').pop() : ''}`);
        } else if (info.status === 'ready') {
          onProgress?.("Local model fully initialized. Parsing prompt parameters...");
        }
      }
    });

    const lPrompt = `<|system|>\nYou are a professional sound parameter solver. Translate the user prompt to sound configs. Return ONLY a single raw valid JSON block like:\n{"searchQuery": "descriptive text phrase", "tiksType": "click", "toneforgeRecipe": "laser", "originalPrompt": "${prompt}"}\nGuidelines: tiksType must be click, pop, success, or notify. toneforgeRecipe must be laser, explosion, powerup, jump, or coin. Return ONLY JSON.\n<|user|>\nTranslate: "${prompt}"\n<|assistant|>\n`;
    
    onProgress?.("Generating parameters using local Llama 3.2-3B model (approx. 5-10s)...");
    const output = await generator(lPrompt, { 
      max_new_tokens: 150, 
      temperature: 0.1 
    });

    const outputText = Array.isArray(output) ? output[0].generated_text : output;
    // Extract JSON block
    const jsonMatch = outputText.slice(lPrompt.length).match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      const tiksTypeValues = ['click', 'pop', 'success', 'notify'];
      const toneforgeRecipeValues = ['laser', 'explosion', 'powerup', 'jump', 'coin'];

      const tiksType = tiksTypeValues.includes(parsed.tiksType) ? parsed.tiksType : 'click';
      const toneforgeRecipe = toneforgeRecipeValues.includes(parsed.toneforgeRecipe) ? parsed.toneforgeRecipe : 'laser';
      const searchQuery = parsed.searchQuery || prompt;

      onProgress?.("Local Llama generation complete!");
      return {
        searchQuery,
        tiksType,
        toneforgeRecipe,
        originalPrompt: prompt
      };
    }
  } catch (error) {
    console.warn("Transformers.js pipeline initialization or generation failed:", error);
  }

  // 3. Perfect fallback to high fidelity regex heuristical solver
  onProgress?.("Using high-performance semantic audio heuristics parser...");
  const regexResult = fallbackRegexParser(prompt);
  await new Promise(resolve => setTimeout(resolve, 600)); // smooth visual transition
  onProgress?.("Semantic mapping complete!");
  return regexResult;
}
