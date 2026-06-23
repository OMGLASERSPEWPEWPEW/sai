import { useMemo } from 'react';
import type { RoomMember } from './useRoom';
import type { Submission } from './useSubmissions';

export interface ReadyLight {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  hasSubmitted: boolean;
}

export function useReadyLights(
  members: RoomMember[],
  submissions: Submission[]
): ReadyLight[] {
  return useMemo(() => {
    const submittedUserIds = new Set(submissions.map((s) => s.user_id));

    return members.map((member) => ({
      userId: member.user_id,
      displayName: member.profile?.display_name ?? 'Unknown',
      avatarUrl: member.profile?.avatar_url ?? null,
      hasSubmitted: submittedUserIds.has(member.user_id),
    }));
  }, [members, submissions]);
}
