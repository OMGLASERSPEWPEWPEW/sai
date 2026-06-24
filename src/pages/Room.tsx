import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { useRound } from '../hooks/useRound';
import { useSubmissions } from '../hooks/useSubmissions';
import { useReadyLights } from '../hooks/useReadyLights';
import { useChat } from '../hooks/useChat';
import { useReactions } from '../hooks/useReactions';
import { RoomHeader } from '../components/RoomHeader';
import { ChatView } from '../components/ChatView';
import { ReadyLights } from '../components/ReadyLights';
import { SubmissionInput } from '../components/SubmissionInput';
import ConnectionBanner from '../components/ConnectionBanner';

export function Room() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    room,
    members,
    isLoading: roomLoading,
    error: roomError,
  } = useRoom(roomId!);

  const { currentRound, startNewRound, isLoading: roundLoading } = useRound(roomId!);

  const {
    submissions,
    submitIdea,
    hasSubmitted,
    isSubmitting,
  } = useSubmissions(currentRound?.id ?? null);

  const lights = useReadyLights(members, submissions);

  const {
    messages,
    isLoading: chatLoading,
    connectionState,
  } = useChat(roomId!);

  const { toggleReaction, getReactionsForMessage } = useReactions(roomId!);

  function handleLeave() {
    navigate('/');
  }

  if (roomLoading || roundLoading || chatLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (roomError || !room) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-red-400">{roomError ?? 'Room not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const roundStatus = currentRound?.status ?? null;
  const showStartButton = !currentRound || currentRound.status === 'complete';
  const showReadyLights = currentRound && currentRound.status !== 'complete';

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <RoomHeader room={room} members={members} onLeave={handleLeave} />
      <ConnectionBanner state={connectionState} />

      <ChatView
        messages={messages}
        currentUserId={user?.id ?? ''}
        getReactionsForMessage={getReactionsForMessage}
        onToggleReaction={toggleReaction}
      />

      {showReadyLights && <ReadyLights lights={lights} />}

      <div className="border-t border-zinc-800 p-3">
        {showStartButton ? (
          <button
            onClick={startNewRound}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <Play className="h-4 w-4" />
            Start New Round
          </button>
        ) : (
          <SubmissionInput
            onSubmit={submitIdea}
            disabled={isSubmitting}
            hasSubmitted={hasSubmitted}
            roundStatus={roundStatus}
          />
        )}
      </div>
    </div>
  );
}
