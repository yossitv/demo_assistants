import { createHash } from 'crypto';
import { HeaderMap } from './apiKey';
import { AuthenticationError, AuthorizationError, InternalError } from './errors';
import { ILogger } from '../domain/services/ILogger';

export interface BearerAuthContext {
  tenantId: string;
  userId: string;
  authMethod: 'bearer';
}

export interface BearerValidationOptions {
  expectedToken?: string;
}

const BEARER_REGEX = /^Bearer\s+(.+)$/i;

export const extractAuthorizationHeader = (headers: HeaderMap): { headerName?: string; value?: string } => {
  if (!headers) {
    return {};
  }

  const normalized = Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key.toLowerCase()] = value;
    }
    return acc;
  }, {});

  if (normalized.authorization === undefined) {
    return {};
  }

  return { headerName: 'authorization', value: normalized.authorization.trim() };
};

export const parseBearerToken = (authorizationHeader?: string): string | undefined => {
  if (!authorizationHeader) {
    return undefined;
  }

  const match = authorizationHeader.match(BEARER_REGEX);
  if (!match) {
    return undefined;
  }

  const token = match[1].trim();
  return token || undefined;
};

export const buildTokenPreview = (token: string): string => {
  const hash = createHash('sha256').update(token).digest('hex').slice(0, 8);
  const prefix = token.slice(0, 4);
  return `${prefix ? `${prefix}...` : ''}sha256:${hash}`;
};

export const validateBearerToken = (
  headers: HeaderMap,
  logger?: ILogger,
  options: BearerValidationOptions = {}
): BearerAuthContext => {
  const { value: authorization, headerName } = extractAuthorizationHeader(headers);
  const token = parseBearerToken(authorization);
  const logMeta = {
    hasAuthorizationHeader: authorization !== undefined,
    headerName,
    tokenPreview: token ? buildTokenPreview(token) : undefined,
  };

  if (!authorization || !token) {
    logger?.warn('Missing or malformed Authorization header', logMeta);
    throw new AuthenticationError('Unauthorized');
  }

  const expectedToken = options.expectedToken ?? process.env.TAUVS_API_KEY;
  if (!expectedToken) {
    logger?.error('TAUVS_API_KEY is not configured', undefined, logMeta);
    throw new InternalError('TAUVS_API_KEY is not configured');
  }

  if (token !== expectedToken) {
    logger?.warn('Bearer token mismatch', logMeta);
    throw new AuthorizationError('Forbidden');
  }

  logger?.info('Bearer token authenticated', logMeta);

  return {
    tenantId: 'tauvs',
    userId: 'tauvs-service',
    authMethod: 'bearer',
  };
};
