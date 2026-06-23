import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hash, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function JoinRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();
  const [inviteCode, setInviteCode] = useState(urlCode ?? '');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlCode) {
      setInviteCode(urlCode);
    }
  }, [urlCode]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setIsJoining(true);
    setError(null);

    const code = inviteCode.trim().toUpperCase();

    const { data: room, error: lookupError } = await supabase
      .from('rooms')
      .select('id, max_members')
      .eq('invite_code', code)
      .single();

    if (lookupError || !room) {
      setError('Room not found. Check the invite code and try again.');
      setIsJoining(false);
      return;
    }

    const { data: existing } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      navigate(`/room/${room.id}`);
      return;
    }

    const { count } = await supabase
      .from('room_members')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id);

    if (count !== null && count >= (room.max_members as number)) {
      setError('This room is full.');
      setIsJoining(false);
      return;
    }

    const { error: joinError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'member',
      });

    if (joinError) {
      setError(joinError.message);
      setIsJoining(false);
      return;
    }

    navigate(`/room/${room.id}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-6 flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="mb-6 text-2xl font-bold text-zinc-100">Join a Room</h1>

      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="invite-code"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            Invite Code
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-9 pr-3.5 font-mono text-sm uppercase tracking-widest text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              maxLength={6}
              autoFocus
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!inviteCode.trim() || isJoining}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
          Join Room
        </button>
      </form>
    </div>
  );
}
