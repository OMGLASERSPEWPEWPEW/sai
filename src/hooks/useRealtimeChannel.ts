import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel as _RealtimeChannel } from '@supabase/supabase-js';

export type { _RealtimeChannel as RealtimeChannel };

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

interface UseRealtimeChannelOptions {
  channelName: string;
  enabled: boolean;
  setup: (channel: RealtimeChannel) => RealtimeChannel;
  onConnected?: () => void;
}

export function useRealtimeChannel({
  channelName,
  enabled,
  setup,
  onConnected,
}: UseRealtimeChannelOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [retryCount, setRetryCount] = useState(0);
  const hasConnected = useRef(false);
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  useEffect(() => {
    if (!enabled) return;

    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = setup(
      supabase.channel(channelName),
    ).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        hasConnected.current = true;
        setConnectionState('connected');
        onConnectedRef.current?.();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (hasConnected.current) setConnectionState('disconnected');
        retryTimer = setTimeout(() => setRetryCount((c) => c + 1), 3000);
      } else {
        if (hasConnected.current) setConnectionState('connecting');
      }
    });

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        onConnectedRef.current?.();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [channelName, enabled, setup, retryCount]);

  return { connectionState };
}
