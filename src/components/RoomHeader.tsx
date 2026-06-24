import { useState } from 'react';
import { Copy, Check, Users, ArrowLeft, QrCode } from 'lucide-react';
import type { Room, RoomMember } from '../hooks/useRoom';
import QRCodeModal from './QRCodeModal';

interface RoomHeaderProps {
  room: Room;
  members: RoomMember[];
  onLeave: () => void;
}

export function RoomHeader({ room, members, onLeave }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(room.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('[RoomHeader] Failed to copy invite code');
    }
  }

  return (
    <>
      <header className="relative flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Leave room"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-lg font-semibold text-zinc-100">{room.name}</h1>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {members.length}/{room.max_members}
              </span>

              <button
                onClick={copyInviteCode}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                title="Copy invite code"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-400" />
                    <span className="text-green-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>{room.invite_code}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowQR(true)}
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Show QR invite"
        >
          <QrCode className="h-5 w-5" />
        </button>

        <span className="absolute right-3 top-1 text-[10px] text-zinc-700">
          v{__APP_VERSION__}
        </span>
      </header>

      <QRCodeModal
        inviteCode={room.invite_code}
        roomName={room.name}
        open={showQR}
        onClose={() => setShowQR(false)}
      />
    </>
  );
}
