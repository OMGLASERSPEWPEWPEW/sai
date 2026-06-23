export interface GatewayMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface TextRequest {
  provider: string;
  model: string;
  messages: GatewayMessage[];
  system?: string;
  maxTokens: number;
  temperature?: number;
}

export interface TextResponse {
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
  model: string;
  provider: string;
}

export interface ProviderAdapter {
  call(request: TextRequest): Promise<TextResponse>;
}
