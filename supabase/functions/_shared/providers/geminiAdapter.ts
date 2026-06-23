import type { TextRequest, TextResponse, ProviderAdapter } from './types.ts';

export class GeminiAdapter implements ProviderAdapter {
  async call(request: TextRequest): Promise<TextResponse> {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${apiKey}`;

    const systemMessage = request.system ?? request.messages.find(m => m.role === 'system')?.content;
    const contents = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { maxOutputTokens: request.maxTokens },
    };
    if (systemMessage) body.systemInstruction = { parts: [{ text: systemMessage }] };
    if (request.temperature !== undefined) {
      (body.generationConfig as Record<string, unknown>).temperature = request.temperature;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return {
      text,
      usage: data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata.candidatesTokenCount ?? 0,
      } : undefined,
      model: request.model,
      provider: 'gemini',
    };
  }
}
