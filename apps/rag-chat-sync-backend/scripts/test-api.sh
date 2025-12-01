#!/bin/bash

# RAG Chat Backend API Testing Script
# This script provides example curl commands to test the API

set -e

echo "=========================================="
echo "RAG Chat Backend - API Testing Script"
echo "=========================================="
echo ""

# Check if API URL is provided
if [ -z "$1" ]; then
  echo "Usage: ./scripts/test-api.sh <API_URL> <JWT_TOKEN>"
  echo ""
  echo "Example:"
  echo "  ./scripts/test-api.sh https://abc123.execute-api.us-east-1.amazonaws.com/prod eyJhbGc..."
  echo ""
  exit 1
fi

API_URL=$1
JWT_TOKEN=${2:-""}

if [ -z "$JWT_TOKEN" ]; then
  echo "Warning: No JWT token provided. Authentication will fail."
  echo "Get a JWT token from your Cognito User Pool and pass it as the second argument."
  echo ""
fi

echo "API URL: $API_URL"
echo ""

# Test 1: Create Knowledge Space
echo "Test 1: Create Knowledge Space"
echo "================================"
echo ""
echo "Request:"
cat <<EOF
POST $API_URL/v1/knowledge/create
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "Company Documentation",
  "sourceUrls": [
    "https://example.com/docs/page1",
    "https://example.com/docs/page2"
  ]
}
EOF
echo ""

if [ -n "$JWT_TOKEN" ]; then
  echo "Executing request..."
  curl -X POST "$API_URL/v1/knowledge/create" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Company Documentation",
      "sourceUrls": [
        "https://example.com/docs/page1",
        "https://example.com/docs/page2"
      ]
    }' | jq '.'
  echo ""
fi

read -p "Press Enter to continue to next test..."
echo ""

# Test 2: List Knowledge Spaces
echo "Test 2: List Knowledge Spaces"
echo "=============================="
echo ""
echo "Request:"
cat <<EOF
GET $API_URL/v1/knowledge/list
Authorization: Bearer <JWT_TOKEN>
EOF
echo ""

if [ -n "$JWT_TOKEN" ]; then
  echo "Executing request..."
  curl -X GET "$API_URL/v1/knowledge/list" \
    -H "Authorization: Bearer $JWT_TOKEN" | jq '.'
  echo ""
fi

read -p "Press Enter to continue to next test..."
echo ""

# Test 3: Create Agent
echo "Test 3: Create Agent"
echo "===================="
echo ""
echo "Note: You need a knowledgeSpaceId from Test 1"
echo -n "Enter knowledgeSpaceId (or press Enter to skip): "
read -r knowledge_space_id
echo ""

if [ -n "$knowledge_space_id" ]; then
  echo "Request:"
  cat <<EOF
POST $API_URL/v1/agent/create
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "Support Agent",
  "knowledgeSpaceIds": ["$knowledge_space_id"],
  "description": "AI assistant for customer support",
  "strictRAG": true
}
EOF
  echo ""

  if [ -n "$JWT_TOKEN" ]; then
    echo "Executing request..."
    curl -X POST "$API_URL/v1/agent/create" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Support Agent\",
        \"knowledgeSpaceIds\": [\"$knowledge_space_id\"],
        \"description\": \"AI assistant for customer support\",
        \"strictRAG\": true
      }" | jq '.'
    echo ""
  fi
fi

read -p "Press Enter to continue to next test..."
echo ""

# Test 4: Chat with Agent
echo "Test 4: Chat with Agent"
echo "======================="
echo ""
echo "Note: You need an agentId from Test 3"
echo -n "Enter agentId (or press Enter to skip): "
read -r agent_id
echo ""

if [ -n "$agent_id" ]; then
  echo "Request:"
  cat <<EOF
POST $API_URL/v1/chat/completions
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "model": "$agent_id",
  "messages": [
    {
      "role": "user",
      "content": "What information do you have about our product?"
    }
  ]
}
EOF
  echo ""

  if [ -n "$JWT_TOKEN" ]; then
    echo "Executing request..."
    curl -X POST "$API_URL/v1/chat/completions" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"$agent_id\",
        \"messages\": [
          {
            \"role\": \"user\",
            \"content\": \"What information do you have about our product?\"
          }
        ]
      }" | jq '.'
    echo ""
  fi
fi

echo ""
echo "=========================================="
echo "API Testing Complete"
echo "=========================================="
echo ""
echo "For more examples, see the API documentation in docs/API.md"
echo ""
