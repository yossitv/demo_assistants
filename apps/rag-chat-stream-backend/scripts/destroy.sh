#!/bin/bash

# RAG Chat Backend Destroy Script
# This script removes all AWS resources created by CDK

set -e

echo "=========================================="
echo "RAG Chat Backend - Destroy Infrastructure"
echo "=========================================="
echo ""

# Warning message
echo "WARNING: This will delete all resources including:"
echo "  - API Gateway"
echo "  - Lambda Functions"
echo "  - DynamoDB Tables (and all data)"
echo "  - CloudWatch Logs"
echo "  - IAM Roles and Policies"
echo ""
echo "Note: Qdrant data and Cognito User Pool will NOT be deleted"
echo ""
echo "Are you sure you want to continue? (yes/no)"
read -r response

if [ "$response" != "yes" ]; then
  echo "Destruction cancelled."
  exit 0
fi

# Double confirmation for production
echo ""
echo "Type the stack name 'RagChatBackendStack' to confirm:"
read -r stack_name

if [ "$stack_name" != "RagChatBackendStack" ]; then
  echo "Stack name doesn't match. Destruction cancelled."
  exit 0
fi

# Check if required environment variables are set
if [ -z "$CDK_DEFAULT_ACCOUNT" ] || [ -z "$CDK_DEFAULT_REGION" ]; then
  echo "Error: CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION must be set"
  echo ""
  echo "Loading from .env file..."
  if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
  else
    echo "Error: .env file not found"
    exit 1
  fi
fi

echo ""
echo "Destroying stack in:"
echo "  Account: $CDK_DEFAULT_ACCOUNT"
echo "  Region: $CDK_DEFAULT_REGION"
echo ""
echo "Starting destruction in 5 seconds... (Press Ctrl+C to cancel)"
sleep 5

# Destroy the stack
echo "Destroying CDK stack..."
cdk destroy --force

if [ $? -ne 0 ]; then
  echo "Error: CDK destroy failed"
  exit 1
fi

echo ""
echo "=========================================="
echo "Infrastructure destroyed successfully!"
echo "=========================================="
echo ""
echo "Remaining cleanup (manual):"
echo "  - Qdrant collections may still contain data"
echo "  - Cognito User Pool (if created separately)"
echo "  - CloudWatch Log Groups may be retained"
echo ""
