#!/bin/bash
set -euo pipefail

INPUT=$(cat)

CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
cd "$CWD" || exit 0

SPEC_NAME=$(basename "$CWD")
SPEC_FILE="${CWD}/${SPEC_NAME}.json"

if [[ ! -f "$SPEC_FILE" ]]; then
  # spec 無いなら何もしない
  exit 0
fi

LOG_DIR=$(jq -r '.log_dir // ".kiro/logs"' "$SPEC_FILE")
mkdir -p "$LOG_DIR"

# tasks[].completed が全部 true なら完了とみなす
DONE=$(jq -r '
  if .tasks then
    ([.tasks[].completed] | all)
  else
    "no_tasks"
  end
' "$SPEC_FILE")

if [[ "$DONE" != "true" ]]; then
  # タスク未完 or tasks 無し
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat <<EOF >> "${LOG_DIR}/events.jsonl"
{"timestamp":"${TIMESTAMP}","event":"multiagent_done","agent_id":"system"}
EOF

SESSION="${SPEC_NAME}-multiagent"

if tmux has-session -t "${SESSION}" 2>/dev/null; then
  tmux kill-session -t "${SESSION}"
fi

exit 0
