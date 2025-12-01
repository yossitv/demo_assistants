# Setup Guide (build & deploy)

## What went wrong before
- `npm test` was crashing `jest` workers in parallel. Fixed by running tests in-band (`jest --runInBand`).
- CDK deploy rolled back with `API Key already exists (409)` while the stack was in `ROLLBACK_COMPLETE`. Cleaning the stack and re-deploying with a unique API key resolved it.

## Prerequisites
- Node.js 20+
- AWS CLI configured for the target account/region (us-east-1 assumed below)
- Env vars (at minimum):
  - `EXPECTED_API_KEY` (>=20 chars) – used for auth and API Gateway key
  - `OPENAI_API_KEY`
  - `QDRANT_URL`
  - `QDRANT_API_KEY`
  - `CDK_DEFAULT_ACCOUNT`, `CDK_DEFAULT_REGION` (e.g. us-east-1)

Optional overrides:
```
API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/
AGENT_ID=<your-agent-id>  # for curl tests
```

## Build & Test (local)
```bash
cd apps/rag-chat-stream-backend
npm install
npm run build
npm test           # in-band; 39 suites pass
```

## Package Lambda bundle
```bash
cd apps/rag-chat-stream-backend
bash scripts/prepare-lambda.sh
```

## Deploy (CDK)
If a previous stack failed/rolled back, delete it first:
```bash
aws cloudformation delete-stack --stack-name RagStreamAPI --region us-east-1
aws cloudformation wait stack-delete-complete --stack-name RagStreamAPI --region us-east-1
```

Deploy (avoid output-dir conflicts):
```bash
cd apps/rag-chat-stream-backend
set -a && source .env && set +a   # if using .env
npm run cdk:deploy -- --require-approval never --region us-east-1 --output cdk.out.deploy
```

Outputs to note:
- `ApiUrl` (e.g., `https://q1i0cptpee.execute-api.us-east-1.amazonaws.com/prod/`)
- `RagStreamApiKeyValue` (should match `EXPECTED_API_KEY`)

## Quick verification (streaming)
```bash
API_URL="https://q1i0cptpee.execute-api.us-east-1.amazonaws.com/prod/"
API_KEY="example-test-api-key-12345123451234512345"
AGENT_ID="agent_1764419063006_b60x88rjm"  # replace with yours

curl -N -S \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"'"${AGENT_ID}"'","messages":[{"role":"user","content":"Hello"}],"stream":true}' \
  "${API_URL}v1/chat/completions/stream"
```

Helper script: `./test_api_curl.sh` (uses `.env` and defaults above).
