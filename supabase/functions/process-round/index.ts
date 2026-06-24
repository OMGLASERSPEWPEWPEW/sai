import { createHandler } from '../_shared/handler.ts';
import { jsonOk, jsonError } from '../_shared/cors.ts';
import { AnthropicAdapter } from '../_shared/providers/anthropicAdapter.ts';
import { GeminiAdapter } from '../_shared/providers/geminiAdapter.ts';
import { sendPushToUser } from '../_shared/push.ts';
import type { ProviderAdapter, TextRequest } from '../_shared/providers/types.ts';

interface ModelConfig {
  provider: string;
  model: string;
}

const MODEL_CHAIN: ModelConfig[] = [
  { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
  { provider: 'gemini', model: 'gemini-2.0-flash' },
];

function getAdapter(provider: string): ProviderAdapter {
  switch (provider) {
    case 'anthropic': return new AnthropicAdapter();
    case 'gemini': return new GeminiAdapter();
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

const SYSTEM_PROMPT = 'You are Mindshare AI, a collaborative intelligence that synthesizes multiple perspectives into unified insights. Be concise, actionable, and highlight how the different ideas connect.';

Deno.serve(createHandler('process-round', async ({ body, auth, cors }) => {
  const { round_id } = body as { round_id?: string };
  if (!round_id) return jsonError('round_id required', 400, cors);

  const { db, userId } = auth;

  const { data: round, error: roundError } = await db
    .from('rounds')
    .select('*, rooms(*)')
    .eq('id', round_id)
    .single();

  if (roundError || !round) return jsonError('Round not found', 404, cors);

  if (round.status !== 'collecting') {
    return jsonOk({ status: round.status, message: 'Already processed' }, cors);
  }

  const { data: membership } = await db
    .from('room_members')
    .select('user_id')
    .eq('room_id', round.room_id)
    .eq('user_id', userId)
    .single();

  if (!membership) return jsonError('Not a room member', 403, cors);

  const { data: submissions } = await db
    .from('submissions')
    .select('*, profiles:user_id(display_name)')
    .eq('round_id', round_id)
    .order('submitted_at', { ascending: true });

  const { count: memberCount } = await db
    .from('room_members')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', round.room_id);

  if (!submissions || submissions.length < (memberCount ?? 3)) {
    return jsonOk({ status: 'waiting', submitted: submissions?.length ?? 0, needed: memberCount }, cors);
  }

  await db
    .from('rounds')
    .update({ status: 'processing' })
    .eq('id', round_id);

  const participantEntries = submissions.map((s: any, i: number) => {
    const name = s.profiles?.display_name ?? `Participant ${i + 1}`;
    return `**${name}**: ${s.content}`;
  });

  const combinedPrompt = `Three people in a collaborative brainstorming session each independently submitted their ideas. Please synthesize, connect, and expand on all three perspectives into a cohesive response.

${participantEntries.join('\n\n')}

Combine these ideas into a unified, insightful response that:
- Identifies common themes across the submissions
- Highlights unique contributions from each participant
- Suggests connections between the ideas
- Proposes actionable next steps`;

  let aiResponse;
  for (const config of MODEL_CHAIN) {
    try {
      const adapter = getAdapter(config.provider);
      const request: TextRequest = {
        provider: config.provider,
        model: config.model,
        messages: config.provider === 'anthropic'
          ? [{ role: 'user', content: combinedPrompt }]
          : [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: combinedPrompt }],
        system: config.provider === 'anthropic' ? SYSTEM_PROMPT : undefined,
        maxTokens: 2048,
        temperature: 0.7,
      };
      aiResponse = await adapter.call(request);
      break;
    } catch (err) {
      console.error(`[process-round] ${config.provider}/${config.model} failed:`, err);
      if (config === MODEL_CHAIN[MODEL_CHAIN.length - 1]) throw err;
    }
  }

  await db.from('messages').insert({
    room_id: round.room_id,
    type: 'ai_response',
    content: aiResponse!.text,
    round_id: round_id,
    metadata: {
      model: aiResponse!.model,
      provider: aiResponse!.provider,
      usage: aiResponse!.usage,
    },
  });

  await db
    .from('rounds')
    .update({ status: 'complete', completed_at: new Date().toISOString() })
    .eq('id', round_id);

  // Notify all room members that the AI responded
  const { data: roomMembers } = await db
    .from('room_members')
    .select('user_id')
    .eq('room_id', round.room_id);

  if (roomMembers) {
    const roomName = round.rooms?.name ?? 'Mindshare';
    for (const member of roomMembers) {
      if (member.user_id !== userId) {
        sendPushToUser(db, member.user_id, {
          title: roomName,
          body: 'Mindshare AI has synthesized your ideas!',
          tag: `room:${round.room_id}`,
          url: `/room/${round.room_id}`,
        });
      }
    }
  }

  return jsonOk({ status: 'complete', model: aiResponse!.model }, cors);
}));
