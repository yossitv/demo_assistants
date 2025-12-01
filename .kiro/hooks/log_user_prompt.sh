#!/bin/bash
set -euo pipefail

INPUT=$(cat)

CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# agent_id / log_dir は spawn_multi_agent から --env で渡す前提
AGENT_ID="${AGENT_ID:-unknown}"

# spec 名と spec ファイル
SPEC_NAME=$(basename "$CWD")
SPEC_FILE="${CWD}/${SPEC_NAME}.json"

if [[ -f "$SPEC_FILE" ]]; then
  LOG_DIR=$(jq -r '.log_dir // ".kiro/logs"' "$SPEC_FILE")
else
  LOG_DIR=".kiro/logs"
fi

mkdir -p "$LOG_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 改行などをエスケープして JSONL に書き込む
ESCAPED_PROMPT=$(printf '%s' "$PROMPT" \
  | sed 's/\\/\\\\/g' \
  | sed 's/"/\\"/g' \
  | sed ':a;N;$!ba;s/\n/\\n/g')

cat <<EOF >> "${LOG_DIR}/events.jsonl"
{"timestamp":"${TIMESTAMP}","event":"prompt","agent_id":"${AGENT_ID}","prompt":"${ESCAPED_PROMPT}"}
EOF

exit 0
