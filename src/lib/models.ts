// lib/models.ts
// Model registry: defines all available models and maps features to models.
// Changing which model a feature uses = editing one line in MODEL_REGISTRY.

import type { Provider } from './gateway';

export type Modality = 'text' | 'image' | 'video';

export interface ModelDef {
  provider: Provider;
  model: string;
  displayName: string;
  modality: Modality;
  costPer1MInput?: number;      // USD per 1M input tokens (text)
  costPer1MOutput?: number;     // USD per 1M output tokens (text)
  costPerGeneration?: number;   // USD per generation (image/video)
  maxContextTokens?: number;    // text models
  supportsImages?: boolean;     // text models that accept image input
}

// ---------------------------------------------------------------------------
// Model catalog
// ---------------------------------------------------------------------------

export const MODELS: Record<string, ModelDef> = {
  // -- Anthropic (Text) -----------------------------------------------------
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    modality: 'text',
    costPer1MInput: 3.0,
    costPer1MOutput: 15.0,
    maxContextTokens: 200_000,
    supportsImages: true,
  },

  // -- OpenAI (Text) --------------------------------------------------------
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    modality: 'text',
    costPer1MInput: 2.5,
    costPer1MOutput: 10.0,
    maxContextTokens: 128_000,
    supportsImages: true,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    modality: 'text',
    costPer1MInput: 0.15,
    costPer1MOutput: 0.6,
    maxContextTokens: 128_000,
    supportsImages: true,
  },

  // -- Google Gemini (Text) -------------------------------------------------
  'gemini-2.0-flash': {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    modality: 'text',
    costPer1MInput: 0.1,
    costPer1MOutput: 0.4,
    maxContextTokens: 1_000_000,
    supportsImages: true,
  },
  'gemini-2.0-flash-lite': {
    provider: 'gemini',
    model: 'gemini-2.0-flash-lite',
    displayName: 'Gemini 2.0 Flash Lite',
    modality: 'text',
    costPer1MInput: 0.025,
    costPer1MOutput: 0.1,
    maxContextTokens: 1_000_000,
    supportsImages: true,
  },
  'gemini-1.5-pro': {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    modality: 'text',
    costPer1MInput: 1.25,
    costPer1MOutput: 5.0,
    maxContextTokens: 2_000_000,
    supportsImages: true,
  },

  // -- DeepSeek (Text) ------------------------------------------------------
  'deepseek-chat': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    displayName: 'DeepSeek Chat (V3)',
    modality: 'text',
    costPer1MInput: 0.27,
    costPer1MOutput: 1.1,
    maxContextTokens: 64_000,
    supportsImages: false,
  },
  'deepseek-reasoner': {
    provider: 'deepseek',
    model: 'deepseek-reasoner',
    displayName: 'DeepSeek Reasoner (R1)',
    modality: 'text',
    costPer1MInput: 0.55,
    costPer1MOutput: 2.19,
    maxContextTokens: 64_000,
    supportsImages: false,
  },

  // -- OpenAI (Image) -------------------------------------------------------
  'dall-e-3': {
    provider: 'openai',
    model: 'dall-e-3',
    displayName: 'DALL-E 3',
    modality: 'image',
    costPerGeneration: 0.04,
  },

  // -- Google (Image) -------------------------------------------------------
  'imagen-4-fast': {
    provider: 'gemini',
    model: 'imagen-4-fast',
    displayName: 'Imagen 4 Fast',
    modality: 'image',
    costPerGeneration: 0.02,
  },
  'imagen-4': {
    provider: 'gemini',
    model: 'imagen-4',
    displayName: 'Imagen 4',
    modality: 'image',
    costPerGeneration: 0.04,
  },

  // -- OpenAI (Video) -------------------------------------------------------
  'sora-2': {
    provider: 'openai',
    model: 'sora-2',
    displayName: 'Sora 2',
    modality: 'video',
    costPerGeneration: 0.40,
  },
};

// ---------------------------------------------------------------------------
// Feature -> model mapping
// ---------------------------------------------------------------------------

export interface FeatureModelConfig {
  primary: string;
  fallback?: string;
}

/**
 * Map your app features to models. Change the `primary` value to switch
 * which model a feature uses -- no other code changes needed.
 */
export const MODEL_REGISTRY: Record<string, FeatureModelConfig> = {
  'mindshare-combine': { primary: 'claude-sonnet-4-5', fallback: 'gemini-2.0-flash' },
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getModelForFeature(feature: string): ModelDef {
  const config = MODEL_REGISTRY[feature];
  const modelKey = config?.primary ?? 'claude-sonnet-4-5';
  const modelDef = MODELS[modelKey];

  if (!modelDef) {
    console.warn(`Unknown model key "${modelKey}" for feature "${feature}"`);
    return MODELS['claude-sonnet-4-5'];
  }

  return modelDef;
}

export function getFallbackModelForFeature(feature: string): ModelDef | undefined {
  const config = MODEL_REGISTRY[feature];
  if (!config?.fallback) return undefined;
  return MODELS[config.fallback];
}
