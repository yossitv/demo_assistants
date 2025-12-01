import { z } from 'zod';
import { ValidationError } from './errors';

const urlSchema = z.string().url({ message: 'Invalid URL format' }).refine(
  value => value.startsWith('http://') || value.startsWith('https://'),
  { message: 'URL must start with http:// or https://' }
);

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1, 'Message content is required').max(4000)
});

export const knowledgeCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  sourceUrls: z.array(urlSchema).nonempty('sourceUrls must include at least one URL').max(50)
});

export const agentCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  knowledgeSpaceIds: z.array(z.string().min(1)).nonempty('knowledgeSpaceIds cannot be empty'),
  description: z.string().max(500).optional(),
  strictRAG: z.boolean().optional().default(true)
});

export const chatRequestSchema = z.object({
  model: z.string().min(1, 'model is required'),
  messages: z.array(chatMessageSchema)
    .nonempty('messages must include at least one entry')
    .refine(msgs => msgs.some(m => m.role === 'user'), 'messages must include a user message'),
  stream: z.boolean().optional().default(false)
});

export type KnowledgeCreateBody = z.infer<typeof knowledgeCreateSchema>;
export type AgentCreateBody = z.infer<typeof agentCreateSchema>;
export type ChatRequestBody = z.infer<typeof chatRequestSchema>;

const parseJsonBody = (body: string | null): any => {
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw new ValidationError('Request body must be valid JSON');
  }
};

export const validateKnowledgeCreateBody = (body: string | null): KnowledgeCreateBody => {
  const parsed = parseJsonBody(body);
  const result = knowledgeCreateSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError(result.error.errors[0]?.message || 'Invalid request body');
  }
  return result.data;
};

export const validateAgentCreateBody = (body: string | null): AgentCreateBody => {
  const parsed = parseJsonBody(body);
  const result = agentCreateSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError(result.error.errors[0]?.message || 'Invalid request body');
  }
  return result.data;
};

export const validateChatRequestBody = (body: string | null): ChatRequestBody => {
  const parsed = parseJsonBody(body);
  const result = chatRequestSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError(result.error.errors[0]?.message || 'Invalid request body');
  }
  return result.data;
};
