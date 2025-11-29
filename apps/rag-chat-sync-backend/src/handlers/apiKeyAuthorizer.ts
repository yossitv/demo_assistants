import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { validateApiKey } from '../shared/apiKeyCheck';

/**
 * Lambda authorizer handler for API key authentication
 * Uses fail-closed validation - denies access unless API key is valid
 */
export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const headers = event.headers || {};

  const validationResult = validateApiKey(headers, {
    debug: (msg, meta) => console.log(JSON.stringify({ level: 'debug', message: msg, ...meta })),
    info: (msg, meta) => console.log(JSON.stringify({ level: 'info', message: msg, ...meta })),
    warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', message: msg, ...meta })),
    error: (msg, err, meta) => console.error(JSON.stringify({ level: 'error', message: msg, error: err?.message, ...meta })),
  });

  if (!validationResult.isValid) {
    // Fail-closed: return Deny policy
    return {
      principalId: 'unauthorized',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: event.methodArn,
          },
        ],
      },
    };
  }

  const resourceArn = buildResourceArn(event.methodArn);

  // Return Allow policy with validated context
  const policy: APIGatewayAuthorizerResult = {
    principalId: validationResult.userId!,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: resourceArn,
        },
      ],
    },
    context: {
      tenantId: validationResult.tenantId!,
      userId: validationResult.userId!,
      authType: 'api-key',
    },
  };

  return policy;
};

/**
 * Build an IAM resource ARN that covers all methods/resources in the same stage.
 * Example input: arn:aws:execute-api:us-east-1:123456789012:apiId/prod/POST/resource
 * Output:         arn:aws:execute-api:us-east-1:123456789012:apiId/prod/* (method/resource wildcards)
 */
const buildResourceArn = (methodArn: string): string => {
  const arnParts = methodArn.split(':');
  const apiGatewayPart = arnParts[5]?.split('/') ?? [];
  const [restApiId, stage] = apiGatewayPart;

  if (!restApiId || !stage) {
    return methodArn;
  }

  return `arn:${arnParts[1]}:execute-api:${arnParts[3]}:${arnParts[4]}:${restApiId}/${stage}/*/*`;
};
