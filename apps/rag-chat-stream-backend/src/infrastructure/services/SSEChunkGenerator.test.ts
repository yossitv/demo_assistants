import { SSEChunkGenerator } from './SSEChunkGenerator';

const parseChunk = (chunk: string) => JSON.parse(chunk.replace(/^data: /, '').trim());

describe('SSEChunkGenerator', () => {
  it('splits content on UTF-8 boundaries without breaking multibyte characters', () => {
    const generator = new SSEChunkGenerator(7);
    const text = 'こんにちは世界';

    const chunks = generator.generateFromText(text, {
      id: 'chatcmpl-utf8',
      model: 'gpt-test',
      created: 1
    });

    const payloads = chunks
      .filter(chunk => chunk.startsWith('data: {'))
      .map(parseChunk);

    const contentParts = payloads
      .map(p => p.choices[0].delta.content)
      .filter((part): part is string => typeof part === 'string');

    expect(contentParts.length).toBeGreaterThan(0);
    contentParts.forEach(part => {
      expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(7);
    });
    expect(contentParts.join('')).toBe(text);
  });

  it('creates OpenAI-compatible SSE payloads with role, content, finish reason and done sentinel', () => {
    const generator = new SSEChunkGenerator();
    const created = 1_720_000_000;

    const chunks = generator.generateFromText('Hello world', {
      id: 'chatcmpl-format',
      model: 'gpt-4o-mini',
      created
    }, {
      citedUrls: ['https://example.com/resource']
    });

    expect(chunks[chunks.length - 1]).toBe('data: [DONE]\n\n');

    const payloads = chunks
      .filter(chunk => chunk.startsWith('data: {'))
      .map(parseChunk);

    const first = payloads[0];
    expect(first.object).toBe('chat.completion.chunk');
    expect(first.id).toBe('chatcmpl-format');
    expect(first.model).toBe('gpt-4o-mini');
    expect(first.created).toBe(created);
    expect(first.choices[0].delta.role).toBe('assistant');
    expect(first.choices[0].index).toBe(0);
    expect(first.choices[0].finish_reason).toBeNull();

    const contentChunk = payloads.find(p => typeof p.choices[0].delta.content === 'string');
    expect(contentChunk?.choices[0].delta.content).toContain('Hello');
    expect(contentChunk?.choices[0].finish_reason).toBeNull();

    const finalChunk = payloads[payloads.length - 1];
    expect(finalChunk.choices[0].finish_reason).toBe('stop');
    expect(finalChunk.choices[0].delta.cited_urls).toEqual(['https://example.com/resource']);
  });
});
