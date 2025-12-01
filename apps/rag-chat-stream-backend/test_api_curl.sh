#!/usr/bin/env bash
set -euo pipefail

# Optional: load .env if present and not already loaded
if [[ -f ".env" ]]; then
  set -a
  source .env
  set +a
fi

API_URL="${API_URL:-https://q1i0cptpee.execute-api.us-east-1.amazonaws.com/prod/}"
API_KEY="${EXPECTED_API_KEY:-${RAG_STREAM_API_KEY:-${TAUVS_API_KEY:-}}}"
AGENT_ID="${AGENT_ID:-agent_1764419063006_b60x88rjm}"

if [[ -z "${API_KEY}" ]]; then
  echo "ERROR: Set EXPECTED_API_KEY (or RAG_STREAM_API_KEY/TAUVS_API_KEY) in env or .env" >&2
  exit 1
fi

if [[ -z "${AGENT_ID}" ]]; then
  echo "ERROR: Set AGENT_ID (e.g. created via /v1/agent/create)" >&2
  exit 1
fi

PAYLOAD=$(cat <<EOF
{"model":"${AGENT_ID}","messages":[{"role":"user","content":"Hello from streaming test"}],"stream":true}
EOF
)

echo "Target : ${API_URL}v1/chat/completions/stream"
echo "Agent  : ${AGENT_ID}"
echo "API key: (using EXPECTED_API_KEY)"
echo "---"

curl -N -S \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" \
  "${API_URL}v1/chat/completions/stream"

