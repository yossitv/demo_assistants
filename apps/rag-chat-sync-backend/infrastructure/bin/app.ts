#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RagChatBackendStack } from '../lib/rag-chat-backend-stack';

const app = new cdk.App();

new RagChatBackendStack(app, 'RagChatBackendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'RAG Chat Backend MVP - Serverless API with DynamoDB, Qdrant, and OpenAI',
});

app.synth();
