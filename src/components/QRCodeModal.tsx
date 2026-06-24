import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Sun } from 'lucide-react';

interface QRCodeModalProps {
  inviteCode: string;
  roomName: string;
  open: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ inviteCode, roomName, open, onClose }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [bright, setBright] = useState(false);

  if (!open) return null;

  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: bright ? '#FFFDF8' : 'rgba(9, 9, 11, 0.95)' }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 p-2 text-zinc-400 hover:text-zinc-200"
        style={bright ? { color: '#7A6657' } : undefined}
      >
        <X size={22} />
      </button>

      <div className="flex flex-col items-center text-center gap-4 max-w-sm">
        <h2
          className="text-3xl font-bold"
          style={{ color: bright ? '#3B2A1E' : '#e4e4e7' }}
        >
          Join {roomName}
        </h2>
        <p
          className="text-base font-medium"
          style={{ color: bright ? '#3B2A1E' : '#a1a1aa' }}
        >
          Scan with your phone camera
        </p>

        <div
          className="rounded-3xl p-5 border"
          style={{
            background: '#FFFDF8',
            borderColor: bright ? '#e5e0db' : '#27272a',
          }}
        >
          <QRCodeSVG value={inviteUrl} size={206} level="M" includeMargin={false} />
          <div className="mt-2 text-center">
            <span className="font-semibold text-sm text-[#3B2A1E]">
              Mindshare
            </span>
            <span className="text-xs text-[#7A6657] ml-1.5">
              · {inviteCode}
            </span>
          </div>
        </div>

        <p
          className="text-sm max-w-[280px]"
          style={{ color: bright ? '#7A6657' : '#71717a' }}
        >
          Anyone who scans this code can join your room and collaborate.
        </p>
      </div>

      <div className="flex gap-2.5 mt-6">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-sm font-medium rounded-full px-4 py-2 border transition-transform active:scale-[0.97]"
          style={bright
            ? { color: '#3B2A1E', background: '#FFF', borderColor: '#e5e0db' }
            : { color: '#a1a1aa', background: '#18181b', borderColor: '#27272a' }
          }
        >
          {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button
          onClick={() => setBright((b) => !b)}
          className="flex items-center gap-1.5 text-sm font-medium rounded-full px-4 py-2 border transition-transform active:scale-[0.97]"
          style={bright
            ? { color: '#3B2A1E', background: '#FFF', borderColor: '#e5e0db' }
            : { color: '#a1a1aa', background: '#18181b', borderColor: '#27272a' }
          }
        >
          <Sun size={15} />
          Brighten
        </button>
      </div>
    </div>
  );
}
