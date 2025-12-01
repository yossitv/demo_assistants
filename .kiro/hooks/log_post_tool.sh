#!/bin/bash
set -euo pipefail

INPUT=$(cat)

CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
cd "$CWD" || exit 0

SPEC_NAME=$(basename "$CWD")
SPEC_FILE="${CWD}/${SPEC_NAME}.json"

if [[ -f "$SPEC_FILE" ]]; then
  LOG_DIR=$(jq -r '.log_dir // ".kiro/logs"' "$SPEC_FILE")
else
  LOG_DIR=".kiro/logs"
fi

mkdir -p "$LOG_DIR"

AGENT_ID="${AGENT_ID:-unknown}"

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}')
TOOL_RESP=$(echo "$INPUT" | jq -c '.tool_response // {}')

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat <<EOF >> "${LOG_DIR}/events.jsonl"
{"timestamp":"${TIMESTAMP}","event":"task_end","agent_id":"${AGENT_ID}","tool_name":"${TOOL_NAME}","tool_input":${TOOL_INPUT},"tool_response":${TOOL_RESP}}
EOF

exit 0
