import * as jwt from 'jsonwebtoken';
import { ILogger } from '../domain/services/ILogger';

export interface JwtPayload {
  sub: string;
  'custom:tenant_id': string;
  [key: string]: unknown;
}

export interface JwtVerificationResult {
  isValid: boolean;
  payload?: JwtPayload;
  error?: string;
}

export function verifyJwt(
  token: string,
  logger?: ILogger
): JwtVerificationResult {
  const timestamp = new Date().toISOString();

  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    const error = 'JWT_SECRET not configured';
    logger?.warn('JWT verification failed', { timestamp, error, hasJWT: false });
    return { isValid: false, error };
  }

  if (!token) {
    const error = 'Empty JWT token';
    logger?.warn('JWT verification failed', { timestamp, error, hasJWT: false });
    return { isValid: false, error };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
    
    if (!decoded.sub || !decoded['custom:tenant_id']) {
      const error = 'Missing required claims';
      logger?.warn('JWT verification failed', { timestamp, error, hasJWT: true });
      return { isValid: false, error };
    }

    logger?.info('JWT verification succeeded', { timestamp, hasJWT: true });
    
    return {
      isValid: true,
      payload: decoded
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Invalid JWT';
    logger?.warn('JWT verification failed', { timestamp, error, hasJWT: true });
    return { isValid: false, error };
  }
}
