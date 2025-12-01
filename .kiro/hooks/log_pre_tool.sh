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
TOOL_INPUT_JSON=$(echo "$INPUT" | jq -c '.tool_input // {}')

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat <<EOF >> "${LOG_DIR}/events.jsonl"
{"timestamp":"${TIMESTAMP}","event":"task_start","agent_id":"${AGENT_ID}","tool_name":"${TOOL_NAME}","tool_input":${TOOL_INPUT_JSON}}
EOF

########################################
# Safety validation
########################################

BLOCK_PATTERNS='(/etc/|rm -rf|rm -fr|sudo rm|del /s|mkfs|format)'

# tool_name から危険っぽいツールを検知
if echo "$TOOL_NAME" | grep -qiE "(rm|delete|format|mkfs)"; then
  if echo "$TOOL_INPUT_JSON" | grep -qiE "$BLOCK_PATTERNS"; then
    echo "ERROR: Dangerous operation detected. Tool execution blocked." >&2
    exit 2
  fi
fi

# 入力だけからも危険パターンチェック
if echo "$TOOL_INPUT_JSON" | grep -qiE "$BLOCK_PATTERNS"; then
  echo "ERROR: Dangerous operation detected. Tool execution blocked." >&2
  exit 2
fi

exit 0
