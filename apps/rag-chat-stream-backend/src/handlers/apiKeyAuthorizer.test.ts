import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { handler } from './apiKeyAuthorizer';

const createAuthorizerEvent = (
  headers: { [key: string]: string } = {},
  methodArn: string = 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/POST/v1/chat/completions'
): APIGatewayRequestAuthorizerEvent => ({
  type: 'REQUEST',
  methodArn,
  headers,
  requestContext: {
    accountId: '123456789012',
    apiId: 'abcdef123',
    requestId: 'test-request-id',
    stage: 'prod',
    requestTimeEpoch: Date.now(),
    identity: {
      sourceIp: '127.0.0.1',
      userAgent: 'test-agent'
    }
  } as any,
  resource: '',
  path: '',
  httpMethod: 'POST',
  queryStringParameters: null,
  pathParameters: null,
  stageVariables: null
} as APIGatewayRequestAuthorizerEvent);

describe('apiKeyAuthorizer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns Deny when EXPECTED_API_KEY is not set', async () => {
    delete process.env.EXPECTED_API_KEY;
    const event = createAuthorizerEvent({ authorization: 'Bearer test-key' });
    const result = await handler(event);
    
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    expect(result.principalId).toBe('unauthorized');
  });

  it('returns Deny when API key is missing', async () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const event = createAuthorizerEvent({});
    const result = await handler(event);
    
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('returns Deny when API key is invalid', async () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const event = createAuthorizerEvent({ authorization: 'Bearer wrong-key' });
    const result = await handler(event);
    
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('returns Allow when API key is valid', async () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const event = createAuthorizerEvent({ authorization: 'Bearer valid-key' });
    const result = await handler(event);
    
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(result.context?.tenantId).toBe('api-key-tenant');
    expect(result.context?.userId).toBe('api-key-user');
    expect(result.context?.authType).toBe('api-key');
  });

  it('builds correct resource ARN for wildcard access', async () => {
    process.env.EXPECTED_API_KEY = 'valid-key';
    const methodArn = 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/POST/v1/chat';
    const event = createAuthorizerEvent({ authorization: 'Bearer valid-key' }, methodArn);
    const result = await handler(event);
    
    const statement: any = result.policyDocument.Statement[0];
    expect(statement.Resource).toBe(
      'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/*/*'
    );
  });
});
