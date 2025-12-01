import * as jwt from 'jsonwebtoken';
import { verifyJwt } from './jwtVerify';

describe('verifyJwt', () => {
  const originalEnv = process.env;
  const testSecret = 'test-secret-key';

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns invalid when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET;
    const result = verifyJwt('some-token');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('JWT_SECRET not configured');
  });

  it('returns invalid when token is empty', () => {
    process.env.JWT_SECRET = testSecret;
    const result = verifyJwt('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Empty JWT token');
  });

  it('returns invalid for malformed JWT', () => {
    process.env.JWT_SECRET = testSecret;
    const result = verifyJwt('not-a-jwt');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid for JWT with wrong signature', () => {
    process.env.JWT_SECRET = testSecret;
    const token = jwt.sign({ sub: 'user1', 'custom:tenant_id': 'tenant1' }, 'wrong-secret');
    const result = verifyJwt(token);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid for JWT with non-HS256 algorithm', () => {
    process.env.JWT_SECRET = testSecret;
    const token = jwt.sign({ sub: 'user1', 'custom:tenant_id': 'tenant1' }, testSecret, { algorithm: 'HS512' });
    const result = verifyJwt(token);
    expect(result.isValid).toBe(false);
  });

  it('returns invalid when required claims are missing', () => {
    process.env.JWT_SECRET = testSecret;
    const token = jwt.sign({ sub: 'user1' }, testSecret);
    const result = verifyJwt(token);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Missing required claims');
  });

  it('returns valid for correct JWT with HS256', () => {
    process.env.JWT_SECRET = testSecret;
    const payload = { sub: 'user1', 'custom:tenant_id': 'tenant1' };
    const token = jwt.sign(payload, testSecret, { algorithm: 'HS256' });
    const result = verifyJwt(token);
    expect(result.isValid).toBe(true);
    expect(result.payload?.sub).toBe('user1');
    expect(result.payload?.['custom:tenant_id']).toBe('tenant1');
  });

  it('extracts all claims from valid JWT', () => {
    process.env.JWT_SECRET = testSecret;
    const payload = { 
      sub: 'user1', 
      'custom:tenant_id': 'tenant1',
      email: 'test@example.com',
      role: 'admin'
    };
    const token = jwt.sign(payload, testSecret);
    const result = verifyJwt(token);
    expect(result.isValid).toBe(true);
    expect(result.payload?.email).toBe('test@example.com');
    expect(result.payload?.role).toBe('admin');
  });
});
