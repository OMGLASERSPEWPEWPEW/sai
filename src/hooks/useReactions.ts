import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeChannel, type RealtimeChannel } from './useRealtimeChannel';

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export function useReactions(roomId: string) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    if (!user || !roomId) return;

    async function fetchReactions() {
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('room_id', roomId);

      if (!messages || messages.length === 0) return;

      const messageIds = messages.map((m: { id: string }) => m.id);
      const { data, error } = await supabase
        .from('reactions')
        .select('*')
        .in('message_id', messageIds);

      if (error) {
        console.warn('[useReactions] fetch error (table may not exist yet):', error.message);
        return;
      }
      if (data) setReactions(data);
    }

    fetchReactions();
  }, [user, roomId]);

  const setup = useCallback(
    (channel: RealtimeChannel) =>
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, (payload) => {
          const newReaction = payload.new as Reaction;
          setReactions((prev) => {
            if (prev.some((r) => r.id === newReaction.id)) return prev;
            return [...prev, newReaction];
          });
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reactions' }, (payload) => {
          const deleted = payload.old as { id: string };
          setReactions((prev) => prev.filter((r) => r.id !== deleted.id));
        }),
    [],
  );

  useRealtimeChannel({
    channelName: `reactions:${roomId}`,
    enabled: !!user && !!roomId,
    setup,
  });

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;

      const existing = reactions.find(
        (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji,
      );

      if (existing) {
        setReactions((prev) => prev.filter((r) => r.id !== existing.id));
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existing.id);
        if (error) {
          setReactions((prev) => [...prev, existing]);
        }
      } else {
        const optimistic: Reaction = {
          id: crypto.randomUUID(),
          message_id: messageId,
          user_id: user.id,
          emoji,
          created_at: new Date().toISOString(),
        };
        setReactions((prev) => [...prev, optimistic]);

        const { data, error } = await supabase
          .from('reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji })
          .select('id')
          .single();

        if (error) {
          setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
        } else if (data) {
          setReactions((prev) =>
            prev.map((r) => (r.id === optimistic.id ? { ...r, id: data.id } : r)),
          );
        }
      }
    },
    [user, reactions],
  );

  const getReactionsForMessage = useCallback(
    (messageId: string) => reactions.filter((r) => r.message_id === messageId),
    [reactions],
  );

  return { reactions, toggleReaction, getReactionsForMessage };
}
