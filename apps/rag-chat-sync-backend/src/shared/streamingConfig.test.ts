describe('streamingConfig', () => {
  const originalChunkSize = process.env.CHUNK_SIZE;

  afterEach(() => {
    if (originalChunkSize === undefined) {
      delete process.env.CHUNK_SIZE;
    } else {
      process.env.CHUNK_SIZE = originalChunkSize;
    }
    jest.resetModules();
  });

  const loadConfig = () => {
    let mod: typeof import('./streamingConfig') | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mod = require('./streamingConfig');
    });
    return mod!;
  };

  it('uses default chunk size when env is not set', () => {
    delete process.env.CHUNK_SIZE;
    const { STREAMING_CONFIG, MIN_CHUNK_SIZE, MAX_CHUNK_SIZE } = loadConfig();

    expect(STREAMING_CONFIG.CHUNK_SIZE).toBe(32);
    expect(STREAMING_CONFIG.CHUNK_SIZE).toBeGreaterThanOrEqual(MIN_CHUNK_SIZE);
    expect(STREAMING_CONFIG.CHUNK_SIZE).toBeLessThanOrEqual(MAX_CHUNK_SIZE);
  });

  it('clamps configured chunk size up to minimum when too small', () => {
    process.env.CHUNK_SIZE = '10';
    const { STREAMING_CONFIG, MIN_CHUNK_SIZE } = loadConfig();

    expect(STREAMING_CONFIG.CHUNK_SIZE).toBe(MIN_CHUNK_SIZE);
  });

  it('clamps configured chunk size down to maximum when too large', () => {
    process.env.CHUNK_SIZE = '99';
    const { STREAMING_CONFIG, MAX_CHUNK_SIZE } = loadConfig();

    expect(STREAMING_CONFIG.CHUNK_SIZE).toBe(MAX_CHUNK_SIZE);
  });

  it('exposes SSE headers with CORS merged', () => {
    delete process.env.CHUNK_SIZE;
    const { SSE_HEADERS, STREAMING_CORS_HEADERS } = loadConfig();

    expect(SSE_HEADERS['Content-Type']).toBe('text/event-stream; charset=utf-8');
    expect(SSE_HEADERS['Cache-Control']).toBe('no-cache');
    expect(SSE_HEADERS['Connection']).toBe('keep-alive');
    expect(STREAMING_CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
  });
});
