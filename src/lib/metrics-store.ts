import { supabase } from './supabase';

export interface MetricInput {
  provider: string;
  model: string;
  analysisType?: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  status: 'success' | 'error' | 'abort';
  errorMessage?: string;
}

export interface MetricHandle {
  patchCost(cost: number): void;
}

interface MetricEntry {
  sync_key: string;
  provider: string;
  model: string;
  analysis_type: string | null;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  cost: number | null;
  status: string;
  error_message: string | null;
  created_at: number;
  app_version: string;
}

let buffer: MetricEntry[] = [];
let initialized = false;

const FLUSH_INTERVAL = 15_000;
const FLUSH_THRESHOLD = 10;
const NO_OP_HANDLE: MetricHandle = { patchCost() {} };

function getAuthFromStorage(): { userId: string; accessToken: string } | null {
  try {
    const storageKey = Object.keys(localStorage).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (storageKey) {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const userId = parsed?.user?.id as string | undefined;
        const accessToken = parsed?.access_token as string | undefined;
        if (userId && accessToken) return { userId, accessToken };
      }
    }
  } catch {
    // fall through
  }
  return null;
}

export function pushMetric(input: MetricInput): MetricHandle {
  const auth = getAuthFromStorage();
  if (!auth) return NO_OP_HANDLE;

  const entry: MetricEntry = {
    sync_key: auth.userId,
    provider: input.provider,
    model: input.model,
    analysis_type: input.analysisType ?? null,
    latency_ms: Math.round(input.latencyMs),
    input_tokens: input.inputTokens ?? null,
    output_tokens: input.outputTokens ?? null,
    cost: input.cost ?? null,
    status: input.status,
    error_message: input.errorMessage ?? null,
    created_at: Date.now(),
    app_version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0',
  };

  buffer.push(entry);
  if (buffer.length >= FLUSH_THRESHOLD) flushAsync();

  return {
    patchCost(cost: number) {
      entry.cost = cost;
    },
  };
}

export function initMetricsStore(): void {
  if (initialized) return;
  initialized = true;
  setInterval(flushAsync, FLUSH_INTERVAL);
  window.addEventListener('beforeunload', flushSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAsync();
  });
}

async function flushAsync(): Promise<void> {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0);
  const { error } = await supabase.from('ai_metrics').insert(batch);
  if (error) console.warn('[metrics-store] flush failed:', error.message);
}

function flushSync(): void {
  if (buffer.length === 0) return;
  const auth = getAuthFromStorage();
  if (!auth) return;
  const batch = buffer.splice(0);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  try {
    fetch(`${supabaseUrl}/rest/v1/ai_metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${auth.accessToken}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(batch),
      keepalive: true,
    });
  } catch {
    // Best-effort
  }
}
