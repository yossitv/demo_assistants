import { validateApiKey } from './apiKeyCheck';

describe('validateApiKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns invalid when EXPECTED_API_KEY is not set', () => {
    delete process.env.EXPECTED_API_KEY;
    const result = validateApiKey({ authorization: 'Bearer test-key' });
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('RAG_STREAM_API_KEY/EXPECTED_API_KEY not configured');
  });

  it('returns invalid when Authorization header is missing', () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const result = validateApiKey({});
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('No Authorization header');
  });

  it('returns invalid when API key is empty', () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const result = validateApiKey({ authorization: 'Bearer ' });
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Empty API key');
  });

  it('returns invalid when API key does not match', () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const result = validateApiKey({ authorization: 'Bearer wrong-key' });
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Invalid API key');
  });

  it('returns valid when API key matches', () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const result = validateApiKey({ authorization: 'Bearer valid-key' });
    expect(result.isValid).toBe(true);
    expect(result.tenantId).toBe('api-key-tenant');
    expect(result.userId).toBe('api-key-user');
  });

  it('handles Authorization header without Bearer prefix', () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const result = validateApiKey({ authorization: 'valid-key' });
    expect(result.isValid).toBe(true);
  });

  it('handles case-insensitive Authorization header', () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const result = validateApiKey({ Authorization: 'Bearer valid-key' });
    expect(result.isValid).toBe(true);
  });
});
