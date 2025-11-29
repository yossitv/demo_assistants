#!/bin/bash

# Test streaming endpoint
echo "🧪 Testing Streaming Endpoint..."
echo ""

# Load environment variables
source .env

# Test 1: Streaming request
echo "📡 Test 1: Streaming Request"
echo "----------------------------"
curl -N -X POST http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer ${TEST_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "test-agent",
    "messages": [{"role": "user", "content": "Hello, test streaming!"}],
    "stream": true
  }'

echo ""
echo ""

# Test 2: Non-streaming request
echo "📄 Test 2: Non-Streaming Request"
echo "--------------------------------"
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer ${TEST_API_KEY}" \
  -H "Content-Type": "application/json" \
  -d '{
    "model": "test-agent",
    "messages": [{"role": "user", "content": "Hello, test non-streaming!"}],
    "stream": false
  }'

echo ""
echo ""

# Test 3: Invalid auth
echo "🔒 Test 3: Invalid Authorization"
echo "--------------------------------"
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "test-agent",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'

echo ""
echo ""
echo "✅ Tests complete!"
