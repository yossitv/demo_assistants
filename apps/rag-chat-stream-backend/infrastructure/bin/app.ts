#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RagChatStreamBackendStack } from '../lib/rag-chat-stream-backend-stack';

const app = new cdk.App();

new RagChatStreamBackendStack(app, 'RagStreamAPI', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'RAG Chat Stream Backend - Serverless API with streaming support',
});

app.synth();
