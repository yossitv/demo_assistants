#!/bin/bash

# RAG Chat Backend Environment Setup Script
# This script helps set up the development environment

set -e

echo "=========================================="
echo "RAG Chat Backend - Environment Setup"
echo "=========================================="
echo ""

# Check if .env file exists
if [ -f .env ]; then
  echo "Warning: .env file already exists."
  echo "Do you want to overwrite it? (y/n)"
  read -r response
  if [ "$response" != "y" ]; then
    echo "Keeping existing .env file. Exiting."
    exit 0
  fi
fi

# Create .env file from template
if [ -f .env.example ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo ".env file created!"
else
  echo "Error: .env.example file not found"
  exit 1
fi

echo ""
echo "Please provide the following configuration values:"
echo ""

# OpenAI API Key
echo -n "Enter your OpenAI API Key: "
read -r openai_key
sed -i.bak "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$openai_key|" .env

# Qdrant URL
echo -n "Enter your Qdrant URL (e.g., https://your-cluster.qdrant.io): "
read -r qdrant_url
sed -i.bak "s|QDRANT_URL=.*|QDRANT_URL=$qdrant_url|" .env

# Qdrant API Key (optional)
echo -n "Enter your Qdrant API Key (press Enter to skip if not required): "
read -r qdrant_key
if [ -n "$qdrant_key" ]; then
  sed -i.bak "s|QDRANT_API_KEY=.*|QDRANT_API_KEY=$qdrant_key|" .env
fi

# AWS Account ID
echo -n "Enter your AWS Account ID (12 digits): "
read -r aws_account
sed -i.bak "s|CDK_DEFAULT_ACCOUNT=.*|CDK_DEFAULT_ACCOUNT=$aws_account|" .env

# AWS Region
echo -n "Enter your AWS Region (e.g., us-east-1): "
read -r aws_region
sed -i.bak "s|CDK_DEFAULT_REGION=.*|CDK_DEFAULT_REGION=$aws_region|" .env

# Cognito User Pool ID
echo ""
echo "Do you have an existing Cognito User Pool? (y/n)"
read -r has_cognito
if [ "$has_cognito" = "y" ]; then
  echo -n "Enter your Cognito User Pool ID: "
  read -r cognito_pool_id
  sed -i.bak "s|COGNITO_USER_POOL_ID=.*|COGNITO_USER_POOL_ID=$cognito_pool_id|" .env
else
  echo "Note: You'll need to create a Cognito User Pool manually or update the CDK stack to create one."
fi

# Remove backup files
rm -f .env.bak

echo ""
echo "=========================================="
echo "Environment setup completed!"
echo "=========================================="
echo ""
echo "Configuration saved to .env file"
echo ""
echo "Next steps:"
echo "  1. Review and edit .env file if needed"
echo "  2. Install dependencies: npm install"
echo "  3. Build the project: npm run build"
echo "  4. Run tests: npm test"
echo "  5. Deploy to AWS: ./scripts/deploy.sh"
echo ""
