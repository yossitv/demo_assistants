#!/bin/bash

# RAG Chat Backend Deployment Script
# This script deploys the RAG Chat Backend to AWS using CDK

set -e

echo "=========================================="
echo "RAG Chat Backend - CDK Deployment Script"
echo "=========================================="
echo ""

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  set -a
  source .env
  set +a
  echo "Environment variables loaded!"
  echo ""
fi

# Check if required environment variables are set
if [ -z "$CDK_DEFAULT_ACCOUNT" ] || [ -z "$CDK_DEFAULT_REGION" ]; then
  echo "Error: CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION must be set"
  echo ""
  echo "Example:"
  echo "  export CDK_DEFAULT_ACCOUNT=123456789012"
  echo "  export CDK_DEFAULT_REGION=us-east-1"
  echo ""
  echo "Or add them to your .env file"
  exit 1
fi

if [ -z "$OPENAI_API_KEY" ] || [ -z "$QDRANT_URL" ]; then
  echo "Error: OPENAI_API_KEY and QDRANT_URL must be set"
  echo ""
  echo "Please check your .env file and ensure:"
  echo "  - OPENAI_API_KEY is set"
  echo "  - QDRANT_URL is set"
  echo "  - COGNITO_USER_POOL_ID is set (if using existing user pool)"
  echo ""
  exit 1
fi

echo "Deployment Configuration:"
echo "  Account: $CDK_DEFAULT_ACCOUNT"
echo "  Region: $CDK_DEFAULT_REGION"
echo "  Cognito User Pool ID: ${COGNITO_USER_POOL_ID:-<will be created>}"
echo ""

# Build TypeScript code
echo "Step 1: Building TypeScript code..."
npm run build

if [ $? -ne 0 ]; then
  echo "Error: TypeScript build failed"
  exit 1
fi

echo "Build completed successfully!"
echo ""

# Run tests (optional, comment out to skip)
echo "Step 2: Running tests..."
npm test

if [ $? -ne 0 ]; then
  echo "Warning: Tests failed. Continue deployment anyway? (y/n)"
  read -r response
  if [ "$response" != "y" ]; then
    exit 1
  fi
fi

echo "Tests completed!"
echo ""

# Bootstrap CDK (if not already done)
echo "Step 3: Checking CDK bootstrap status..."
cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION 2>&1 | grep -q "already bootstrapped" || {
  echo "Bootstrapping CDK environment..."
  cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
}

echo "CDK environment ready!"
echo ""

# Synthesize CloudFormation template
echo "Step 4: Synthesizing CloudFormation template..."
npm run cdk:synth

if [ $? -ne 0 ]; then
  echo "Error: CDK synthesis failed"
  exit 1
fi

echo "CloudFormation template synthesized successfully!"
echo ""

# Deploy to AWS
echo "Step 5: Deploying to AWS..."
echo "This may take several minutes..."
echo ""

npm run cdk:deploy -- --require-approval never

if [ $? -ne 0 ]; then
  echo "Error: CDK deployment failed"
  exit 1
fi

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Note the API Gateway URL from the output above"
echo "  2. Configure your Cognito User Pool with custom:tenant_id claim"
echo "  3. Test the API endpoints using the documentation"
echo ""
