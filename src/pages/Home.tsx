import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Hash, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface RoomSummary {
  id: string;
  name: string;
  max_members: number;
  member_count: number;
  last_activity: string;
}

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchRooms() {
      setIsLoading(true);

      const { data: memberships, error: memberError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user!.id);

      if (memberError || !memberships?.length) {
        setRooms([]);
        setIsLoading(false);
        return;
      }

      const roomIds = memberships.map((m) => m.room_id as string);

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, name, max_members, created_at')
        .in('id', roomIds);

      if (roomError || !roomData) {
        setRooms([]);
        setIsLoading(false);
        return;
      }

      const summaries: RoomSummary[] = await Promise.all(
        roomData.map(async (room) => {
          const { count } = await supabase
            .from('room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);

          const { data: latestMsg } = await supabase
            .from('messages')
            .select('created_at')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: room.id as string,
            name: room.name as string,
            max_members: room.max_members as number,
            member_count: count ?? 0,
            last_activity: (latestMsg?.created_at as string) ?? (room.created_at as string),
          };
        })
      );

      summaries.sort(
        (a, b) =>
          new Date(b.last_activity).getTime() -
          new Date(a.last_activity).getTime()
      );

      setRooms(summaries);
      setIsLoading(false);
    }

    fetchRooms();
  }, [user]);

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Your Rooms</h1>
          <p className="text-sm text-zinc-500">
            Collaborative idea sessions
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-3">
        <button
          onClick={() => navigate('/create')}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Create Room
        </button>

        <button
          onClick={() => navigate('/join')}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
        >
          <Hash className="h-4 w-4" />
          Join Room
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 px-6 py-16 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
          <h2 className="mb-1 text-lg font-medium text-zinc-300">
            No rooms yet
          </h2>
          <p className="text-sm text-zinc-500">
            Create a room to start collaborating, or join one with an invite
            code.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => navigate(`/room/${room.id}`)}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
            >
              <div>
                <h3 className="font-medium text-zinc-100">{room.name}</h3>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {room.member_count}/{room.max_members}
                  </span>
                  <span>{formatRelativeTime(room.last_activity)}</span>
                </div>
              </div>

              <svg
                className="h-4 w-4 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
