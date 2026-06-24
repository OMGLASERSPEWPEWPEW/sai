import type { Reaction } from '../hooks/useReactions';

interface ReactionChipsProps {
  reactions: Reaction[];
  currentUserId: string;
  isMine: boolean;
  onToggle: (emoji: string) => void;
}

export default function ReactionChips({ reactions, currentUserId, isMine, onToggle }: ReactionChipsProps) {
  if (reactions.length === 0) return null;

  const grouped = new Map<string, { count: number; iReacted: boolean }>();
  for (const r of reactions) {
    const existing = grouped.get(r.emoji);
    if (existing) {
      existing.count++;
      if (r.user_id === currentUserId) existing.iReacted = true;
    } else {
      grouped.set(r.emoji, { count: 1, iReacted: r.user_id === currentUserId });
    }
  }

  return (
    <div className={`flex gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {Array.from(grouped.entries()).map(([emoji, { count, iReacted }]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
            iReacted
              ? 'bg-indigo-500/20 border border-indigo-500/40'
              : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-zinc-400">{count}</span>}
        </button>
      ))}
    </div>
  );
}
