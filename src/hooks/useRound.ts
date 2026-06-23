import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Round {
  id: string;
  room_id: string;
  round_number: number;
  status: 'collecting' | 'processing' | 'complete';
  created_at: string;
  completed_at: string | null;
}

interface UseRoundReturn {
  currentRound: Round | null;
  startNewRound: () => Promise<void>;
  isLoading: boolean;
}

export function useRound(roomId: string): UseRoundReturn {
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentRound = useCallback(async () => {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('room_id', roomId)
      .neq('status', 'complete')
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[useRound] fetch error:', error.message);
      return;
    }

    setCurrentRound(data as Round | null);
  }, [roomId]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      await fetchCurrentRound();
      if (mounted) setIsLoading(false);
    }

    load();

    const channel = supabase
      .channel(`rounds:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rounds',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchCurrentRound();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchCurrentRound]);

  const startNewRound = useCallback(async () => {
    const { data: latest } = await supabase
      .from('rounds')
      .select('round_number')
      .eq('room_id', roomId)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = latest ? (latest.round_number as number) + 1 : 1;

    const { error } = await supabase.from('rounds').insert({
      room_id: roomId,
      round_number: nextNumber,
      status: 'collecting',
    });

    if (error) {
      console.error('[useRound] startNewRound error:', error.message);
      throw new Error(error.message);
    }
  }, [roomId]);

  return { currentRound, startNewRound, isLoading };
}
