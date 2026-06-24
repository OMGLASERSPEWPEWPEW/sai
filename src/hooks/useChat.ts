import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useRealtimeChannel, type ConnectionState, type RealtimeChannel } from './useRealtimeChannel';

export interface Message {
  id: string;
  room_id: string;
  type: 'system' | 'ai_response' | 'user_chat';
  content: string;
  user_id: string | null;
  round_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UseChatReturn {
  messages: Message[];
  sendChatMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  connectionState: ConnectionState;
}

export function useChat(roomId: string): UseChatReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[useChat] fetch error:', error.message);
      return;
    }

    setMessages((data ?? []) as Message[]);
  }, [roomId]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      await fetchMessages();
      if (mounted) setIsLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [fetchMessages]);

  const setup = useCallback(
    (channel: RealtimeChannel) =>
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => { fetchMessages(); }
      ),
    [roomId, fetchMessages]
  );

  const { connectionState } = useRealtimeChannel({
    channelName: `messages:${roomId}`,
    enabled: true,
    setup,
    onConnected: fetchMessages,
  });

  const sendChatMessage = useCallback(
    async (content: string) => {
      if (!user) return;

      const { error } = await supabase.from('messages').insert({
        room_id: roomId,
        type: 'user_chat',
        content,
        user_id: user.id,
      });

      if (error) {
        console.error('[useChat] sendChatMessage error:', error.message);
        throw new Error(error.message);
      }
    },
    [roomId, user]
  );

  return { messages, sendChatMessage, isLoading, connectionState };
}
