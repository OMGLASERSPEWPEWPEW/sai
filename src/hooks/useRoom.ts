import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Room {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  max_members: number;
  created_at: string;
}

export interface RoomMember {
  room_id: string;
  user_id: string;
  role: 'creator' | 'member';
  joined_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface UseRoomReturn {
  room: Room | null;
  members: RoomMember[];
  isLoading: boolean;
  error: string | null;
  isFull: boolean;
}

export function useRoom(roomId: string): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setRoom(data as Room);
  }, [roomId]);

  const fetchMembers = useCallback(async () => {
    const { data: memberRows, error: memberError } = await supabase
      .from('room_members')
      .select('room_id, user_id, role, joined_at')
      .eq('room_id', roomId);

    if (memberError) {
      setError(memberError.message);
      return;
    }

    const userIds = (memberRows ?? []).map((r: Record<string, unknown>) => r.user_id as string);

    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
      : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p]),
    );

    const mapped: RoomMember[] = (memberRows ?? []).map((row: Record<string, unknown>) => {
      const profile = profileMap.get(row.user_id as string) as Record<string, unknown> | undefined;
      return {
        room_id: row.room_id as string,
        user_id: row.user_id as string,
        role: row.role as 'creator' | 'member',
        joined_at: row.joined_at as string,
        profile: profile
          ? { display_name: profile.display_name as string, avatar_url: profile.avatar_url as string | null }
          : undefined,
      };
    });

    setMembers(mapped);
  }, [roomId]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      await Promise.all([fetchRoom(), fetchMembers()]);
      if (mounted) setIsLoading(false);
    }

    load();

    const channel = supabase
      .channel(`room_members:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoom, fetchMembers]);

  const isFull = room ? members.length >= room.max_members : false;

  return { room, members, isLoading, error, isFull };
}
