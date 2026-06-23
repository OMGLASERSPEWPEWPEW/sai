import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AnthropicAdapter } from '../_shared/providers/anthropicAdapter.ts';
import { GeminiAdapter } from '../_shared/providers/geminiAdapter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { round_id } = await req.json();
    if (!round_id) {
      return new Response(JSON.stringify({ error: 'round_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the round
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('*, rooms(*)')
      .eq('id', round_id)
      .single();

    if (roundError || !round) {
      return new Response(JSON.stringify({ error: 'Round not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotent guard: only process if status is 'collecting'
    if (round.status !== 'collecting') {
      return new Response(JSON.stringify({ status: round.status, message: 'Already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is a room member
    const { data: membership } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', round.room_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a room member' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all submissions for this round
    const { data: submissions } = await supabase
      .from('submissions')
      .select('*, profiles:user_id(display_name)')
      .eq('round_id', round_id)
      .order('submitted_at', { ascending: true });

    // Get room member count
    const { count: memberCount } = await supabase
      .from('room_members')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', round.room_id);

    // Check if all members have submitted
    if (!submissions || submissions.length < (memberCount ?? 3)) {
      return new Response(JSON.stringify({ status: 'waiting', submitted: submissions?.length ?? 0, needed: memberCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update round status to processing
    await supabase
      .from('rounds')
      .update({ status: 'processing' })
      .eq('id', round_id);

    // Build the combined prompt
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

    // Call the AI (try Anthropic first, fall back to Gemini)
    let aiResponse;
    try {
      const anthropic = new AnthropicAdapter();
      aiResponse = await anthropic.call({
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        messages: [{ role: 'user', content: combinedPrompt }],
        system: 'You are Mindshare AI, a collaborative intelligence that synthesizes multiple perspectives into unified insights. Be concise, actionable, and highlight how the different ideas connect.',
        maxTokens: 2048,
        temperature: 0.7,
      });
    } catch (primaryError) {
      console.error('Primary model failed, trying fallback:', primaryError);
      const gemini = new GeminiAdapter();
      aiResponse = await gemini.call({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: 'You are Mindshare AI, a collaborative intelligence that synthesizes multiple perspectives into unified insights. Be concise, actionable, and highlight how the different ideas connect.' },
          { role: 'user', content: combinedPrompt },
        ],
        maxTokens: 2048,
        temperature: 0.7,
      });
    }

    // Store the AI response as a message
    await supabase.from('messages').insert({
      room_id: round.room_id,
      type: 'ai_response',
      content: aiResponse.text,
      round_id: round_id,
      metadata: {
        model: aiResponse.model,
        provider: aiResponse.provider,
        usage: aiResponse.usage,
      },
    });

    // Update round status to complete
    await supabase
      .from('rounds')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', round_id);

    return new Response(JSON.stringify({ status: 'complete', model: aiResponse.model }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('process-round error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
