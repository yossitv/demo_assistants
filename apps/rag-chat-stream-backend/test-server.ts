import http from 'http';
import { DIContainer } from './src/infrastructure/di/DIContainer';
import { APIGatewayProxyEvent } from './src/shared/types';

const PORT = 3001;

// Initialize DI Container
const container = DIContainer.getInstance();
const controller = container.getChatCompletionsStreamController();

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const requestBody = JSON.parse(body);
        
        // Create mock API Gateway event
        const event: APIGatewayProxyEvent = {
          body: JSON.stringify(requestBody),
          headers: {
            'Authorization': req.headers.authorization || '',
            'Content-Type': 'application/json',
          },
          httpMethod: 'POST',
          path: '/v1/chat/completions',
          queryStringParameters: null,
          pathParameters: null,
          stageVariables: null,
          requestContext: {} as any,
          resource: '',
          isBase64Encoded: false,
          multiValueHeaders: {},
          multiValueQueryStringParameters: null,
        };

        // Create mock response stream
        const responseStream = {
          write: (data: string) => {
            res.write(data);
          },
          end: () => {
            res.end();
          },
          setContentType: (contentType: string) => {
            res.setHeader('Content-Type', contentType);
          },
        };

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle request
        await controller.handle(event, responseStream as any);
      } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Internal server error' } }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not found' } }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Streaming test server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoint: POST http://localhost:${PORT}/v1/chat/completions`);
  console.log(`🔑 Use: Authorization: Bearer ${process.env.TEST_API_KEY}`);
});
