import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function CreateRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<{
    id: string;
    invite_code: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsCreating(true);
    setError(null);

    const inviteCode = generateInviteCode();

    const { data: room, error: createError } = await supabase
      .from('rooms')
      .insert({
        name: name.trim(),
        invite_code: inviteCode,
        created_by: user.id,
        max_members: 3,
      })
      .select('id, invite_code')
      .single();

    if (createError || !room) {
      setError(createError?.message ?? 'Failed to create room');
      setIsCreating(false);
      return;
    }

    const { error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'creator',
      });

    if (memberError) {
      setError(memberError.message);
      setIsCreating(false);
      return;
    }

    setCreatedRoom({
      id: room.id as string,
      invite_code: room.invite_code as string,
    });
    setIsCreating(false);
  }

  async function copyCode() {
    if (!createdRoom) return;
    try {
      await navigator.clipboard.writeText(createdRoom.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('[CreateRoom] Failed to copy');
    }
  }

  if (createdRoom) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-7 w-7 text-green-400" />
          </div>

          <h2 className="mb-1 text-xl font-semibold text-zinc-100">
            Room Created
          </h2>
          <p className="mb-6 text-sm text-zinc-500">
            Share this invite code with your collaborators
          </p>

          <div className="mb-6 flex items-center justify-center gap-2">
            <code className="rounded-lg bg-zinc-800 px-5 py-3 font-mono text-2xl font-bold tracking-widest text-indigo-300">
              {createdRoom.invite_code}
            </code>
            <button
              onClick={copyCode}
              className="rounded-lg bg-zinc-800 p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              title="Copy invite code"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-400" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>

          <button
            onClick={() => navigate(`/room/${createdRoom.id}`)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Go to Room
          </button>
        </div>
      </div>
    );
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

      <h1 className="mb-6 text-2xl font-bold text-zinc-100">Create a Room</h1>

      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="room-name"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            Room Name
          </label>
          <input
            id="room-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product Brainstorm"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            maxLength={60}
            autoFocus
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || isCreating}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Room
        </button>
      </form>
    </div>
  );
}
