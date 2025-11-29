const http = require('http');

const PORT = 3001;
const TEST_API_KEY = 'example-test-api-key-12345';

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const auth = req.headers.authorization || '';
        
        // Check Bearer token
        if (!auth.toLowerCase().startsWith('bearer ')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Missing Bearer token' } }));
          return;
        }

        const token = auth.slice(7);
        if (token !== TEST_API_KEY) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Invalid API key' } }));
          return;
        }

        // Streaming response
        if (data.stream === true) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          const id = 'chatcmpl-' + Date.now();
          const created = Math.floor(Date.now() / 1000);
          const model = data.model || 'test-agent';

          // Initial chunk with role
          res.write(`data: ${JSON.stringify({
            id, object: 'chat.completion.chunk', created, model,
            choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }]
          })}\n\n`);

          // Content chunks
          const message = 'Hello! This is a streaming response from the RAG chat backend. ';
          const chunks = message.match(/.{1,10}/g) || [];
          
          let i = 0;
          const interval = setInterval(() => {
            if (i < chunks.length) {
              res.write(`data: ${JSON.stringify({
                id, object: 'chat.completion.chunk', created, model,
                choices: [{ index: 0, delta: { content: chunks[i] }, finish_reason: null }]
              })}\n\n`);
              i++;
            } else {
              // Final chunk
              res.write(`data: ${JSON.stringify({
                id, object: 'chat.completion.chunk', created, model,
                choices: [{
                  index: 0,
                  delta: { content: '', citedUrls: ['https://example.com'], isRag: true },
                  finish_reason: 'stop'
                }]
              })}\n\n`);
              res.write('data: [DONE]\n\n');
              res.end();
              clearInterval(interval);
            }
          }, 100);
        } else {
          // Non-streaming response
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: 'chatcmpl-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: data.model || 'test-agent',
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello! This is a non-streaming response.',
                citedUrls: ['https://example.com'],
                isRag: true
              },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          }));
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON' } }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not found' } }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Mock streaming server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoint: POST http://localhost:${PORT}/v1/chat/completions`);
  console.log(`🔑 API Key: ${TEST_API_KEY}`);
  console.log('');
  console.log('Test with:');
  console.log(`  curl -N -X POST http://localhost:${PORT}/v1/chat/completions \\`);
  console.log(`    -H "Authorization: Bearer ${TEST_API_KEY}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"model":"test-agent","messages":[{"role":"user","content":"Hello"}],"stream":true}'`);
});
