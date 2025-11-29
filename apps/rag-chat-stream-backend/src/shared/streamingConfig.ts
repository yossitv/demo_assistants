import { CORS_HEADERS } from './cors';

const DEFAULT_CHUNK_SIZE = 32;
export const MIN_CHUNK_SIZE = 20;
export const MAX_CHUNK_SIZE = 50;

const parseChunkSize = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const clampChunkSize = (size: number): number => {
  const rounded = Math.floor(size);
  return Math.min(MAX_CHUNK_SIZE, Math.max(MIN_CHUNK_SIZE, rounded));
};

export const resolveChunkSize = (rawValue?: string): number => {
  const parsed = parseChunkSize(rawValue ?? process.env.CHUNK_SIZE);
  const baseSize = parsed ?? DEFAULT_CHUNK_SIZE;
  return clampChunkSize(baseSize);
};

export const STREAMING_CONFIG = {
  CHUNK_SIZE: resolveChunkSize(),
  MIN_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
};

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

export const STREAMING_CORS_HEADERS = {
  ...CORS_HEADERS,
  ...SSE_HEADERS,
};
