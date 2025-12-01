import { STREAMING_CONFIG, clampChunkSize } from './streamingConfig';

export type DeltaRole = 'assistant';

export interface ChatCompletionChunkDelta {
  role?: DeltaRole;
  content?: string;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: ChatCompletionChunkDelta;
  finish_reason: null | 'stop';
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: [ChatCompletionChunkChoice];
}

export const SSE_DONE_EVENT = 'data: [DONE]\n\n';

export const generateChunkId = (): string => `chatcmpl-${Math.random().toString(36).slice(2, 15)}`;

const epochSeconds = (): number => Math.floor(Date.now() / 1000);

const baseChunk = (id: string, model: string, created?: number) => ({
  id,
  object: 'chat.completion.chunk' as const,
  created: created ?? epochSeconds(),
  model,
});

export const createInitialChunk = (params: { id: string; model: string; created?: number }): ChatCompletionChunk => ({
  ...baseChunk(params.id, params.model, params.created),
  choices: [
    {
      index: 0,
      delta: { role: 'assistant' },
      finish_reason: null,
    },
  ],
});

export const createContentChunk = (params: { id: string; model: string; content: string; created?: number }): ChatCompletionChunk => ({
  ...baseChunk(params.id, params.model, params.created),
  choices: [
    {
      index: 0,
      delta: { content: params.content },
      finish_reason: null,
    },
  ],
});

export const createFinalChunk = (params: { id: string; model: string; created?: number }): ChatCompletionChunk => ({
  ...baseChunk(params.id, params.model, params.created),
  choices: [
    {
      index: 0,
      delta: {},
      finish_reason: 'stop',
    },
  ],
});

export const formatSseEvent = (payload: unknown): string => `data: ${JSON.stringify(payload)}\n\n`;

export const splitAnswerIntoChunks = (answer: string, requestedChunkSize: number = STREAMING_CONFIG.CHUNK_SIZE): string[] => {
  const normalizedSize = clampChunkSize(requestedChunkSize);
  const characters = Array.from(answer);

  if (characters.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  for (let index = 0; index < characters.length; index += normalizedSize) {
    chunks.push(characters.slice(index, index + normalizedSize).join(''));
  }

  return chunks;
};
