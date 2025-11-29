import {
  SSE_DONE_EVENT,
  createContentChunk,
  createFinalChunk,
  createInitialChunk,
  formatSseEvent,
  generateChunkId,
  splitAnswerIntoChunks
} from './sse';
import { STREAMING_CONFIG } from './streamingConfig';

describe('sse utilities', () => {
  it('formats payload as SSE event', () => {
    const payload = { hello: 'world' };
    const formatted = formatSseEvent(payload);

    expect(formatted).toBe(`data: ${JSON.stringify(payload)}\n\n`);
  });

  it('creates OpenAI-compatible chunks', () => {
    const id = 'chatcmpl-test';
    const model = 'agent-1';
    const created = 1_700_000_000;

    const initial = createInitialChunk({ id, model, created });
    expect(initial).toEqual({
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant' },
          finish_reason: null,
        },
      ],
    });

    const content = createContentChunk({ id, model, content: 'hello', created });
    expect(content.choices[0]).toEqual({
      index: 0,
      delta: { content: 'hello' },
      finish_reason: null,
    });

    const final = createFinalChunk({ id, model, created });
    expect(final.choices[0]).toEqual({
      index: 0,
      delta: {},
      finish_reason: 'stop',
    });
  });

  it('generates chunk ids with chatcmpl prefix', () => {
    const id = generateChunkId();

    expect(id.startsWith('chatcmpl-')).toBe(true);
    expect(id.length).toBeGreaterThan('chatcmpl-'.length);
  });

  it('splits text into configured chunk sizes without breaking unicode characters', () => {
    const repeatedEmoji = '😀'.repeat(30);
    const chunks = splitAnswerIntoChunks(repeatedEmoji, STREAMING_CONFIG.MIN_CHUNK_SIZE);
    const codePointLengths = chunks.map(chunk => Array.from(chunk).length);

    expect(codePointLengths[0]).toBe(STREAMING_CONFIG.MIN_CHUNK_SIZE);
    expect(codePointLengths.reduce((sum, len) => sum + len, 0)).toBe(30);
    expect(chunks.join('')).toBe(repeatedEmoji);
  });

  it('clamps small requested chunk sizes up to minimum bound', () => {
    const input = 'a'.repeat(25);
    const chunks = splitAnswerIntoChunks(input, 1);

    expect(chunks[0].length).toBe(STREAMING_CONFIG.MIN_CHUNK_SIZE);
    expect(chunks.join('')).toBe(input);
  });

  it('exposes DONE sentinel event', () => {
    expect(SSE_DONE_EVENT).toBe('data: [DONE]\n\n');
  });
});
