// lib/gateway.ts
// Frontend client for the multi-provider AI gateway.
// Provider-agnostic: callModel() for text, callModelForImage() for images,
// callModelForVideo() for video. All route through a single Edge Function.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'deepseek';
export type Modality = 'text' | 'image' | 'video';

export interface GatewayMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GatewayTextRequest {
  provider: Provider;
  model: string;
  messages: GatewayMessage[];
  system?: string;
  maxTokens: number;
  temperature?: number;
  signal?: AbortSignal;
  timeout?: number;
}

export interface GatewayTextResponse {
  modality: 'text';
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
  model: string;
  provider: Provider;
}

export interface GatewayImageRequest {
  provider: Provider;
  model: string;
  prompt: string;
  size?: string;
  quality?: 'standard' | 'hd';
  signal?: AbortSignal;
  timeout?: number;
}

export interface GatewayImageResponse {
  modality: 'image';
  image: string;          // base64
  revised_prompt?: string;
  model: string;
  provider: Provider;
  estimatedCostUsd?: number;
}

export interface GatewayVideoRequest {
  provider: Provider;
  model: string;
  prompt: string;
  duration?: number;
  resolution?: string;
  referenceImage?: string;
  referenceImageType?: string;
  signal?: AbortSignal;
  timeout?: number;
}

export interface GatewayVideoResponse {
  modality: 'video';
  video: string;          // base64
  revised_prompt?: string;
  model: string;
  provider: Provider;
  estimatedCostUsd?: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const GATEWAY_ENDPOINT = `${SUPABASE_URL}/functions/v1/ai-gateway`;

const DEFAULT_TIMEOUT = 60_000;
const VIDEO_TIMEOUT = 300_000;

type SupabaseAuthClient = {
  auth: { getSession(): Promise<{ data: { session: { access_token: string } | null } }> };
};

let _supabase: SupabaseAuthClient | null = null;

/** Inject your Supabase client. Call once at app init. */
export function setSupabaseClient(client: SupabaseAuthClient): void {
  _supabase = client;
}

async function getAccessToken(): Promise<string | null> {
  if (!_supabase) {
    throw new Error('Supabase client not set — call setSupabaseClient() at app init');
  }
  const { data } = await _supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createTimeoutSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

async function sendRequest(
  body: Record<string, unknown>,
  timeout: number,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('No access token -- user may not be logged in');
  }

  const { signal: fetchSignal, cleanup } = createTimeoutSignal(timeout, signal);

  try {
    const response = await fetch(GATEWAY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: fetchSignal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        (errorData as Record<string, Record<string, string>>)?.error?.message ??
        response.statusText;
      throw new Error(`Gateway error (${response.status}): ${msg}`);
    }

    return await response.json();
  } finally {
    cleanup();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a text completion request through the gateway.
 *
 * @example
 * const response = await callModel({
 *   provider: 'anthropic',
 *   model: 'claude-sonnet-4-5-20250929',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   maxTokens: 1024,
 * });
 * console.log(response.text);
 */
export async function callModel(request: GatewayTextRequest): Promise<GatewayTextResponse> {
  const result = await sendRequest(
    {
      modality: 'text',
      provider: request.provider,
      model: request.model,
      messages: request.messages,
      system: request.system,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    },
    request.timeout ?? DEFAULT_TIMEOUT,
    request.signal,
  );
  return result as unknown as GatewayTextResponse;
}

/**
 * Send a text request and parse the response as JSON.
 */
export async function callModelForObject<T>(request: GatewayTextRequest): Promise<T> {
  const response = await callModel(request);
  const text = response.text;
  // Extract JSON from potential markdown wrapping
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  return JSON.parse(text.slice(start, end + 1)) as T;
}

/**
 * Generate an image through the gateway.
 *
 * @example
 * const response = await callModelForImage({
 *   provider: 'openai',
 *   model: 'dall-e-3',
 *   prompt: 'A sunset over mountains',
 * });
 * const imgSrc = `data:image/png;base64,${response.image}`;
 */
export async function callModelForImage(request: GatewayImageRequest): Promise<GatewayImageResponse> {
  const result = await sendRequest(
    {
      modality: 'image',
      provider: request.provider,
      model: request.model,
      prompt: request.prompt,
      size: request.size ?? '1024x1024',
      quality: request.quality ?? 'standard',
    },
    request.timeout ?? DEFAULT_TIMEOUT,
    request.signal,
  );
  return result as unknown as GatewayImageResponse;
}

/**
 * Generate a video through the gateway.
 * Note: video generation is async and may take 1-5 minutes.
 *
 * @example
 * const response = await callModelForVideo({
 *   provider: 'openai',
 *   model: 'sora-2',
 *   prompt: 'A cat playing piano',
 *   duration: 4,
 * });
 */
export async function callModelForVideo(request: GatewayVideoRequest): Promise<GatewayVideoResponse> {
  const result = await sendRequest(
    {
      modality: 'video',
      provider: request.provider,
      model: request.model,
      prompt: request.prompt,
      duration: request.duration ?? 4,
      resolution: request.resolution ?? '720x1280',
      referenceImage: request.referenceImage,
      referenceImageType: request.referenceImageType,
    },
    request.timeout ?? VIDEO_TIMEOUT,
    request.signal,
  );
  return result as unknown as GatewayVideoResponse;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export function userMessage(text: string): GatewayMessage {
  return { role: 'user', content: text };
}

export function assistantMessage(text: string): GatewayMessage {
  return { role: 'assistant', content: text };
}

export function systemMessage(text: string): GatewayMessage {
  return { role: 'system', content: text };
}
