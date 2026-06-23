import type { TextRequest, TextResponse, ProviderAdapter } from './types.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export class AnthropicAdapter implements ProviderAdapter {
  async call(request: TextRequest): Promise<TextResponse> {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const systemMessage = request.system ?? request.messages.find(m => m.role === 'system')?.content;
    const messages = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      max_tokens: request.maxTokens,
    };
    if (systemMessage) body.system = systemMessage;
    if (request.temperature !== undefined) body.temperature = request.temperature;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return {
      text: data.content[0]?.text ?? '',
      usage: data.usage ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens } : undefined,
      model: data.model,
      provider: 'anthropic',
    };
  }
}
