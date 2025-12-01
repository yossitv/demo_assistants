import { AuthContext } from './auth';

export function validateApiKey(apiKey: string | undefined): AuthContext | null {
  const expectedKey = process.env.EXPECTED_API_KEY;
  
  if (!expectedKey || !apiKey || apiKey !== expectedKey) {
    return null;
  }

  return {
    tenantId: 'default',
    userId: 'api-key-user',
    authMethod: 'apiKey'
  };
}
