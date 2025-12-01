import { ValidationError } from './errors';
import {
  validateAgentCreateBody,
  validateChatRequestBody,
  validateKnowledgeCreateBody
} from './validation';

describe('validateKnowledgeCreateBody', () => {
  describe('valid inputs', () => {
    it('validates knowledge create body with HTTPS URLs', () => {
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: ['https://example.com/page']
      });

      const result = validateKnowledgeCreateBody(body);
      expect(result.name).toBe('Docs');
      expect(result.sourceUrls).toEqual(['https://example.com/page']);
    });

    it('validates knowledge create body with HTTP URLs', () => {
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: ['http://example.com/page']
      });

      const result = validateKnowledgeCreateBody(body);
      expect(result.sourceUrls).toEqual(['http://example.com/page']);
    });

    it('validates knowledge create body with multiple URLs', () => {
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: [
          'https://example.com/page1',
          'http://example.com/page2',
          'https://docs.example.org/api/v1'
        ]
      });

      const result = validateKnowledgeCreateBody(body);
      expect(result.sourceUrls).toHaveLength(3);
    });

    it('validates URLs with query parameters and fragments', () => {
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: [
          'https://example.com/page?param=value&other=123',
          'https://example.com/page#section'
        ]
      });

      const result = validateKnowledgeCreateBody(body);
      expect(result.sourceUrls).toHaveLength(2);
    });
  });

  describe('invalid inputs - name validation', () => {
    it('rejects empty name', () => {
      const body = JSON.stringify({
        name: '',
        sourceUrls: ['https://example.com/page']
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
      expect(() => validateKnowledgeCreateBody(body)).toThrow('name is required');
    });

    it('rejects missing name', () => {
      const body = JSON.stringify({
        sourceUrls: ['https://example.com/page']
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
    });

    it('rejects name exceeding max length', () => {
      const body = JSON.stringify({
        name: 'a'.repeat(101),
        sourceUrls: ['https://example.com/page']
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
    });
  });

  describe('invalid inputs - URL validation', () => {
    it('rejects invalid URL format', () => {
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: ['not-a-url']
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
      expect(() => validateKnowledgeCreateBody(body)).toThrow(/Invalid URL format/);
    });

    it('rejects FTP URLs', () => {
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: ['ftp://invalid.com']
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
      expect(() => validateKnowledgeCreateBody(body)).toThrow(/must start with http/);
    });

    it('rejects file:// URLs', () => {
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: ['file:///etc/passwd']
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
    });

    it('rejects empty sourceUrls array', () => {
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: []
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
      expect(() => validateKnowledgeCreateBody(body)).toThrow(/at least one URL/);
    });

    it('rejects missing sourceUrls field', () => {
      const body = JSON.stringify({
        name: 'Docs'
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
    });

    it('rejects sourceUrls exceeding max length', () => {
      const urls = Array(51).fill('https://example.com');
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: urls
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
    });

    it('rejects when any URL in array is invalid', () => {
      const body = JSON.stringify({
        name: 'Docs',
        sourceUrls: [
          'https://valid.com',
          'invalid-url',
          'https://also-valid.com'
        ]
      });

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
    });
  });

  describe('invalid JSON', () => {
    it('rejects invalid JSON', () => {
      const body = '{bad json}';

      expect(() => validateKnowledgeCreateBody(body)).toThrow(ValidationError);
      expect(() => validateKnowledgeCreateBody(body)).toThrow('Request body must be valid JSON');
    });

    it('rejects null body', () => {
      expect(() => validateKnowledgeCreateBody(null)).toThrow(ValidationError);
    });

    it('rejects empty body', () => {
      expect(() => validateKnowledgeCreateBody('')).toThrow(ValidationError);
    });
  });
});

describe('validateAgentCreateBody', () => {
  describe('valid inputs', () => {
    it('validates agent create body with required fields', () => {
      const body = JSON.stringify({
        name: 'Agent',
        knowledgeSpaceIds: ['ks-1']
      });

      const result = validateAgentCreateBody(body);
      expect(result.name).toBe('Agent');
      expect(result.knowledgeSpaceIds).toEqual(['ks-1']);
    });

    it('applies default value for strictRAG when not provided', () => {
      const body = JSON.stringify({
        name: 'Agent',
        knowledgeSpaceIds: ['ks-1']
      });

      const result = validateAgentCreateBody(body);
      expect(result.strictRAG).toBe(true);
    });

    it('validates agent create body with all optional fields', () => {
      const body = JSON.stringify({
        name: 'Agent',
        knowledgeSpaceIds: ['ks-1', 'ks-2'],
        description: 'A helpful agent',
        strictRAG: false
      });

      const result = validateAgentCreateBody(body);
      expect(result.description).toBe('A helpful agent');
      expect(result.strictRAG).toBe(false);
      expect(result.knowledgeSpaceIds).toHaveLength(2);
    });
  });

  describe('invalid inputs - name validation', () => {
    it('rejects empty name', () => {
      const body = JSON.stringify({
        name: '',
        knowledgeSpaceIds: ['ks-1']
      });

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
      expect(() => validateAgentCreateBody(body)).toThrow('name is required');
    });

    it('rejects missing name', () => {
      const body = JSON.stringify({
        knowledgeSpaceIds: ['ks-1']
      });

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
    });

    it('rejects name exceeding max length', () => {
      const body = JSON.stringify({
        name: 'a'.repeat(101),
        knowledgeSpaceIds: ['ks-1']
      });

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
    });
  });

  describe('invalid inputs - knowledgeSpaceIds validation', () => {
    it('rejects empty knowledgeSpaceIds array', () => {
      const body = JSON.stringify({
        name: 'Agent',
        knowledgeSpaceIds: []
      });

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
      expect(() => validateAgentCreateBody(body)).toThrow(/cannot be empty/);
    });

    it('rejects missing knowledgeSpaceIds field', () => {
      const body = JSON.stringify({
        name: 'Agent'
      });

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
    });

    it('rejects empty string in knowledgeSpaceIds array', () => {
      const body = JSON.stringify({
        name: 'Agent',
        knowledgeSpaceIds: ['']
      });

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
    });

    it('rejects array with mix of valid and invalid IDs', () => {
      const body = JSON.stringify({
        name: 'Agent',
        knowledgeSpaceIds: ['ks-1', '', 'ks-2']
      });

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
    });
  });

  describe('invalid inputs - description validation', () => {
    it('rejects description exceeding max length', () => {
      const body = JSON.stringify({
        name: 'Agent',
        knowledgeSpaceIds: ['ks-1'],
        description: 'a'.repeat(501)
      });

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
    });

    it('accepts empty description', () => {
      const body = JSON.stringify({
        name: 'Agent',
        knowledgeSpaceIds: ['ks-1'],
        description: ''
      });

      const result = validateAgentCreateBody(body);
      expect(result.description).toBe('');
    });
  });

  describe('invalid inputs - strictRAG validation', () => {
    it('rejects non-boolean strictRAG', () => {
      const body = JSON.stringify({
        name: 'Agent',
        knowledgeSpaceIds: ['ks-1'],
        strictRAG: 'true'
      });

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
    });
  });

  describe('invalid JSON', () => {
    it('rejects invalid JSON', () => {
      const body = '{bad json}';

      expect(() => validateAgentCreateBody(body)).toThrow(ValidationError);
      expect(() => validateAgentCreateBody(body)).toThrow('Request body must be valid JSON');
    });

    it('rejects null body', () => {
      expect(() => validateAgentCreateBody(null)).toThrow(ValidationError);
    });
  });
});

describe('validateChatRequestBody', () => {
  describe('valid inputs', () => {
    it('validates chat request with single user message', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: [{ role: 'user', content: 'help me' }]
      });

      const result = validateChatRequestBody(body);
      expect(result.model).toBe('agent-1');
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content).toBe('help me');
    });

    it('validates chat request with multiple messages', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' }
        ]
      });

      const result = validateChatRequestBody(body);
      expect(result.messages).toHaveLength(4);
    });

    it('validates message content up to max length', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: [{ role: 'user', content: 'a'.repeat(4000) }]
      });

      const result = validateChatRequestBody(body);
      expect(result.messages[0].content).toHaveLength(4000);
    });
  });

  describe('invalid inputs - model validation', () => {
    it('rejects empty model', () => {
      const body = JSON.stringify({
        model: '',
        messages: [{ role: 'user', content: 'help' }]
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
      expect(() => validateChatRequestBody(body)).toThrow('model is required');
    });

    it('rejects missing model field', () => {
      const body = JSON.stringify({
        messages: [{ role: 'user', content: 'help' }]
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
    });
  });

  describe('invalid inputs - messages validation', () => {
    it('rejects empty messages array', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: []
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
      expect(() => validateChatRequestBody(body)).toThrow(/at least one entry/);
    });

    it('requires at least one user message', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'assistant', content: 'hello' }
        ]
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
      expect(() => validateChatRequestBody(body)).toThrow(/user message/);
    });

    it('rejects missing messages field', () => {
      const body = JSON.stringify({
        model: 'agent-1'
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
    });
  });

  describe('invalid inputs - message format validation', () => {
    it('rejects invalid role', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: [{ role: 'invalid', content: 'help' }]
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
    });

    it('rejects empty message content', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: [{ role: 'user', content: '' }]
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
      expect(() => validateChatRequestBody(body)).toThrow(/Message content is required/);
    });

    it('rejects message content exceeding max length', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: [{ role: 'user', content: 'a'.repeat(4001) }]
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
    });

    it('rejects missing role field', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: [{ content: 'help' }]
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
    });

    it('rejects missing content field', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: [{ role: 'user' }]
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
    });

    it('rejects malformed message object', () => {
      const body = JSON.stringify({
        model: 'agent-1',
        messages: ['invalid']
      });

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
    });
  });

  describe('invalid JSON', () => {
    it('rejects invalid JSON', () => {
      const body = '{bad json}';

      expect(() => validateChatRequestBody(body)).toThrow(ValidationError);
      expect(() => validateChatRequestBody(body)).toThrow('Request body must be valid JSON');
    });

    it('rejects null body', () => {
      expect(() => validateChatRequestBody(null)).toThrow(ValidationError);
    });
  });
});
