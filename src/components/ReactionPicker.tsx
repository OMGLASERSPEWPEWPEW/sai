import { useEffect, useRef } from 'react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '💡'];

interface ReactionPickerProps {
  position: { x: number; y: number };
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function ReactionPicker({ position, onSelect, onClose }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const barWidth = QUICK_EMOJIS.length * 44 + 16;
  const left = Math.max(8, Math.min(position.x - barWidth / 2, window.innerWidth - barWidth - 8));
  const top = Math.max(8, position.y - 56);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className="fixed z-50 flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-1.5 shadow-2xl animate-[scaleIn_0.15s_ease-out]"
        style={{ left, top }}
      >
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="w-10 h-10 flex items-center justify-center text-xl rounded-full hover:bg-zinc-700 active:scale-110 transition-all"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
