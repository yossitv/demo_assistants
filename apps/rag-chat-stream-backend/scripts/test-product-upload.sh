#!/bin/bash

# Product Upload Integration Test
# Tests the multipart file upload functionality

set -e

echo "=== Product Upload Integration Test ==="
echo ""

# Check environment variables
if [ -z "$API_URL" ]; then
  echo "Error: API_URL environment variable not set"
  echo "Usage: API_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod RAG_STREAM_API_KEY=xxx ./test-product-upload.sh"
  exit 1
fi

if [ -z "$RAG_STREAM_API_KEY" ]; then
  echo "Error: RAG_STREAM_API_KEY environment variable not set"
  exit 1
fi

# Create test markdown file
TEST_FILE="/tmp/test-products.md"
cat > "$TEST_FILE" << 'EOF'
--- item start ---
id: test-prod-001
name: Test Product 1
category: Electronics
price: 99.99
currency: USD
availability: in_stock
tags: [test, demo]
brand: TestBrand
### description
This is a test product for integration testing.
It has multiple lines of description.
--- item end ---

--- item start ---
id: test-prod-002
name: Test Product 2
category: Books
price: 19.99
currency: USD
availability: in_stock
### description
Another test product with minimal fields.
--- item end ---

--- item start ---
name: Invalid Product
### description
This product is missing required ID field and should fail.
--- item end ---
EOF

echo "Created test file: $TEST_FILE"
echo ""

# Upload file
echo "Uploading products..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_URL}/v1/knowledge/create" \
  -H "Authorization: Bearer ${RAG_STREAM_API_KEY}" \
  -F "name=Test Product Catalog" \
  -F "file=@${TEST_FILE}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Verify response
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Upload successful"
  
  # Check if response contains expected fields
  if echo "$BODY" | jq -e '.knowledgeSpaceId' > /dev/null 2>&1; then
    echo "✅ Knowledge Space ID present"
  else
    echo "❌ Knowledge Space ID missing"
  fi
  
  if echo "$BODY" | jq -e '.status' > /dev/null 2>&1; then
    STATUS=$(echo "$BODY" | jq -r '.status')
    echo "✅ Status: $STATUS"
  else
    echo "❌ Status missing"
  fi
  
  if echo "$BODY" | jq -e '.summary' > /dev/null 2>&1; then
    SUCCESS_COUNT=$(echo "$BODY" | jq -r '.summary.successCount')
    FAILURE_COUNT=$(echo "$BODY" | jq -r '.summary.failureCount')
    echo "✅ Summary: $SUCCESS_COUNT successful, $FAILURE_COUNT failed"
  else
    echo "❌ Summary missing"
  fi
else
  echo "❌ Upload failed with status $HTTP_CODE"
  exit 1
fi

# Cleanup
rm -f "$TEST_FILE"

echo ""
echo "=== Test Complete ==="
