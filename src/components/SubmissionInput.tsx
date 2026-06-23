import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface SubmissionInputProps {
  onSubmit: (content: string) => Promise<void>;
  disabled: boolean;
  hasSubmitted: boolean;
  roundStatus: string | null;
}

const MAX_CHARS = 500;

export function SubmissionInput({
  onSubmit,
  disabled,
  hasSubmitted,
  roundStatus,
}: SubmissionInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!roundStatus || roundStatus === 'complete') {
    return null;
  }

  if (roundStatus === 'processing') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-zinc-800/60 px-4 py-5">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
        <span className="text-sm text-zinc-300">AI is thinking...</span>
      </div>
    );
  }

  if (roundStatus === 'collecting' && hasSubmitted) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-zinc-800/60 px-4 py-5">
        <span className="text-sm text-zinc-400">
          Waiting for others
          <span className="inline-flex w-6">
            <span className="animate-[bounce_1.4s_infinite_0ms] text-zinc-500">.</span>
            <span className="animate-[bounce_1.4s_infinite_200ms] text-zinc-500">.</span>
            <span className="animate-[bounce_1.4s_infinite_400ms] text-zinc-500">.</span>
          </span>
        </span>
      </div>
    );
  }

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSubmit(trimmed);
      setContent('');
    } catch (err) {
      console.error('[SubmissionInput] submit error:', err);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="rounded-lg bg-zinc-800/60 p-3">
      <textarea
        className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        rows={3}
        placeholder="Share your idea for this round..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSending}
        maxLength={MAX_CHARS + 50}
      />

      <div className="mt-2 flex items-center justify-between">
        <span
          className={`text-xs ${
            isOverLimit ? 'text-red-400' : 'text-zinc-500'
          }`}
        >
          {charCount}/{MAX_CHARS}
        </span>

        <button
          onClick={handleSubmit}
          disabled={disabled || isSending || !content.trim() || isOverLimit}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit
        </button>
      </div>

      <p className="mt-1 text-[10px] text-zinc-600">
        Press Cmd+Enter to submit
      </p>
    </div>
  );
}
