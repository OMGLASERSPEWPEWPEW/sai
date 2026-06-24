import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useRealtimeChannel, type RealtimeChannel } from './useRealtimeChannel';
import { enqueueSubmission, flushOfflineQueue } from '../lib/offline-queue';

export interface Submission {
  id: string;
  round_id: string;
  user_id: string;
  content: string;
  submitted_at: string;
}

interface UseSubmissionsReturn {
  submissions: Submission[];
  submitIdea: (content: string) => Promise<void>;
  hasSubmitted: boolean;
  isSubmitting: boolean;
}

export function useSubmissions(roundId: string | null): UseSubmissionsReturn {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    if (!roundId) {
      setSubmissions([]);
      return;
    }

    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('round_id', roundId);

    if (error) {
      console.error('[useSubmissions] fetch error:', error.message);
      return;
    }

    setSubmissions((data ?? []) as Submission[]);
  }, [roundId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const setup = useCallback(
    (channel: RealtimeChannel) =>
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `round_id=eq.${roundId}`,
        },
        () => { fetchSubmissions(); }
      ),
    [roundId, fetchSubmissions]
  );

  const flushQueue = useCallback(async () => {
    await flushOfflineQueue(async (qRoundId, content) => {
      try {
        const { error } = await supabase.from('submissions').insert({
          round_id: qRoundId,
          user_id: user?.id,
          content,
        });
        return !error;
      } catch {
        return false;
      }
    });
    fetchSubmissions();
  }, [user, fetchSubmissions]);

  useRealtimeChannel({
    channelName: `submissions:${roundId}`,
    enabled: !!roundId,
    setup,
    onConnected: flushQueue,
  });

  const hasSubmitted = user
    ? submissions.some((s) => s.user_id === user.id)
    : false;

  const submitIdea = useCallback(
    async (content: string) => {
      if (!roundId || !user) return;

      setIsSubmitting(true);
      try {
        const { error: insertError } = await supabase
          .from('submissions')
          .insert({
            round_id: roundId,
            user_id: user.id,
            content,
          });

        if (insertError) {
          enqueueSubmission(roundId, content);
          throw new Error(insertError.message);
        }

        await supabase.functions.invoke('process-round', {
          body: { round_id: roundId },
        });
      } catch (err) {
        console.error('[useSubmissions] submitIdea error:', err);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [roundId, user]
  );

  return { submissions, submitIdea, hasSubmitted, isSubmitting };
}
