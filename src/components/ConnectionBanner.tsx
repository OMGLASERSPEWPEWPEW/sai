import { useState, useEffect, useRef } from 'react';
import type { ConnectionState } from '../hooks/useRealtimeChannel';

interface ConnectionBannerProps {
  state: ConnectionState;
}

export default function ConnectionBanner({ state }: ConnectionBannerProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state === 'connected') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(false);
    } else {
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          setVisible(true);
          timerRef.current = null;
        }, 2000);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state]);

  if (!visible) return null;

  const isDisconnected = state === 'disconnected';

  return (
    <div className={`px-6 py-1.5 border-b flex items-center justify-center gap-2 ${
      isDisconnected
        ? 'bg-red-900/30 border-red-700/40'
        : 'bg-amber-900/30 border-amber-700/40'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
        isDisconnected ? 'bg-red-400' : 'bg-amber-400'
      }`} />
      <span className={`text-xs ${isDisconnected ? 'text-red-300' : 'text-amber-300'}`}>
        {isDisconnected ? 'Reconnecting…' : 'Connecting…'}
      </span>
    </div>
  );
}
