export interface AuthenticationContext {
  tenantId: string;
  userId: string;
  authMethod: 'jwt' | 'apikey';
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
