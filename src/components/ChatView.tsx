import { useRef, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Message } from '../hooks/useChat';
import type { Reaction } from '../hooks/useReactions';
import ReactionPicker from './ReactionPicker';
import ReactionChips from './ReactionChips';

interface ChatViewProps {
  messages: Message[];
  currentUserId: string;
  getReactionsForMessage?: (messageId: string) => Reaction[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

function getInitials(userId: string): string {
  return userId.slice(0, 2).toUpperCase();
}

export function ChatView({ messages, currentUserId, getReactionsForMessage, onToggleReaction }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [picker, setPicker] = useState<{ messageId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleDoubleClick(e: React.MouseEvent, messageId: string) {
    if (!onToggleReaction) return;
    setPicker({ messageId, x: e.clientX, y: e.clientY });
  }

  if (messages.length === 0) {
    return (
      <div
        ref={scrollRef}
        className="flex flex-1 items-center justify-center overflow-y-auto p-4"
      >
        <p className="text-sm text-zinc-500">
          No messages yet. Start a round to begin collaborating.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
    >
      {messages.map((message) => {
        const msgReactions = getReactionsForMessage?.(message.id) ?? [];

        if (message.type === 'system') {
          return (
            <div key={message.id} className="flex justify-center py-1">
              <span className="text-xs italic text-zinc-500">
                {message.content}
              </span>
            </div>
          );
        }

        if (message.type === 'ai_response') {
          return (
            <div
              key={message.id}
              className="w-full rounded-lg border-l-4 border-indigo-500 bg-zinc-800/60 p-4"
              onDoubleClick={(e) => handleDoubleClick(e, message.id)}
            >
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-semibold text-indigo-300">
                  Mindshare AI
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {message.content}
              </p>
              {onToggleReaction && (
                <ReactionChips
                  reactions={msgReactions}
                  currentUserId={currentUserId}
                  isMine={false}
                  onToggle={(emoji) => onToggleReaction(message.id, emoji)}
                />
              )}
            </div>
          );
        }

        const isOwn = message.user_id === currentUserId;

        return (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-zinc-300">
              {getInitials(message.user_id ?? '')}
            </div>

            <div className="max-w-[75%]">
              <div
                className={`rounded-2xl px-3.5 py-2 ${
                  isOwn
                    ? 'rounded-br-sm bg-indigo-600 text-white'
                    : 'rounded-bl-sm bg-zinc-700 text-zinc-100'
                }`}
                onDoubleClick={(e) => handleDoubleClick(e, message.id)}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                <span
                  className={`mt-0.5 block text-right text-[10px] ${
                    isOwn ? 'text-indigo-200/60' : 'text-zinc-500'
                  }`}
                >
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {onToggleReaction && (
                <ReactionChips
                  reactions={msgReactions}
                  currentUserId={currentUserId}
                  isMine={isOwn}
                  onToggle={(emoji) => onToggleReaction(message.id, emoji)}
                />
              )}
            </div>
          </div>
        );
      })}

      {picker && onToggleReaction && (
        <ReactionPicker
          position={{ x: picker.x, y: picker.y }}
          onSelect={(emoji) => {
            onToggleReaction(picker.messageId, emoji);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
