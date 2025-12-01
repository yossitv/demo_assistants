import { AuthenticationError, AuthorizationError, InternalError } from './errors';
import {
  buildTokenPreview,
  extractAuthorizationHeader,
  parseBearerToken,
  validateBearerToken
} from './bearerAuth';
import { ILogger } from '../domain/services/ILogger';

const createLogger = (): ILogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('bearerAuth utilities', () => {
  const originalEnvToken = process.env.TAUVS_API_KEY;

  beforeEach(() => {
    process.env.TAUVS_API_KEY = 'expected-token';
  });

  afterEach(() => {
    if (originalEnvToken === undefined) {
      delete process.env.TAUVS_API_KEY;
    } else {
      process.env.TAUVS_API_KEY = originalEnvToken;
    }
    jest.restoreAllMocks();
  });

  it('extracts authorization header case-insensitively', () => {
    const { value } = extractAuthorizationHeader({ Authorization: 'Bearer abc123' });
    expect(value).toBe('Bearer abc123');

    const lower = extractAuthorizationHeader({ authorization: 'Bearer def456' });
    expect(lower.value).toBe('Bearer def456');
  });

  it('parses bearer tokens only when properly prefixed', () => {
    expect(parseBearerToken('Bearer abc')).toBe('abc');
    expect(parseBearerToken('bearer   token-123')).toBe('token-123');
    expect(parseBearerToken('Token xyz')).toBeUndefined();
    expect(parseBearerToken(undefined)).toBeUndefined();
  });

  it('validates bearer token and avoids logging full token', () => {
    const logger = createLogger();
    const context = validateBearerToken({ Authorization: 'Bearer expected-token' }, logger);

    expect(context).toEqual({
      tenantId: 'tauvs',
      userId: 'tauvs-service',
      authMethod: 'bearer',
    });

    expect((logger.info as jest.Mock).mock.calls[0][0]).toBe('Bearer token authenticated');
    const loggedMeta = (logger.info as jest.Mock).mock.calls[0][1];
    expect(loggedMeta.tokenPreview).toBe(buildTokenPreview('expected-token'));
    expect(loggedMeta.tokenPreview).not.toBe('expected-token');
  });

  it('throws AuthenticationError when header missing or malformed', () => {
    const logger = createLogger();
    expect(() => validateBearerToken({}, logger)).toThrow(AuthenticationError);
    expect(logger.warn).toHaveBeenCalled();

    expect(() => validateBearerToken({ Authorization: 'Token abc' }, logger)).toThrow(AuthenticationError);
  });

  it('throws AuthorizationError for incorrect token', () => {
    const logger = createLogger();
    expect(() => validateBearerToken({ Authorization: 'Bearer wrong-token' }, logger)).toThrow(AuthorizationError);
  });

  it('throws InternalError when expected token is not configured', () => {
    delete process.env.TAUVS_API_KEY;
    const logger = createLogger();

    expect(() => validateBearerToken({ Authorization: 'Bearer expected-token' }, logger)).toThrow(InternalError);
    expect(logger.error).toHaveBeenCalled();
  });
});
