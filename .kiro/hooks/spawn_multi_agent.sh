#!/bin/bash
set -euo pipefail

INPUT=$(cat)

CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
cd "$CWD" || exit 0

SPEC_NAME=$(basename "$CWD")
SPEC_FILE="${CWD}/${SPEC_NAME}.json"

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "Spec file not found: ${SPEC_FILE}, skipping multi-agent spawn." >&2
  exit 0
fi

ORCH=$(jq -r '.orchestrators // 1' "$SPEC_FILE")
ENG=$(jq -r '.engineers_per_orchestrator // 0' "$SPEC_FILE")
REV=$(jq -r '.reviewers_per_orchestrator // 0' "$SPEC_FILE")
LOG_DIR=$(jq -r '.log_dir // ".kiro/logs"' "$SPEC_FILE")

mkdir -p "$LOG_DIR"

SESSION="${SPEC_NAME}-multiagent"

# すでにセッションがあれば何もしない（idempotent）
if tmux has-session -t "${SESSION}" 2>/dev/null; then
  echo "tmux session '${SESSION}' already exists. Skipping spawn." >&2
  exit 0
fi

# 新規セッション作成（最初のウィンドウ = orchestrator-1 用）
tmux new-session -d -s "${SESSION}" -n "orchestrator-1"

########################################
# Orchestrators
########################################

for ((i = 1; i <= ORCH; i++)); do
  WINDOW_INDEX=$((i - 1))

  if [[ $i -gt 1 ]]; then
    tmux new-window -t "${SESSION}" -n "orchestrator-${i}"
  fi

  ORCH_ID="${SPEC_NAME}-orchestrator-${i}"
  CMD="kiro agent start --config orchestrator.json --env agent_id=${ORCH_ID} --env spec=${SPEC_NAME} --env log_dir=${LOG_DIR}"

  tmux send-keys -t "${SESSION}:${WINDOW_INDEX}.0" "$CMD" C-m
done

########################################
# Engineers
########################################

for ((i = 1; i <= ORCH; i++)); do
  WINDOW_INDEX=$((i - 1))

  for ((j = 1; j <= ENG; j++)); do
    ENGINEER_ID="${SPEC_NAME}-engineer-${i}-${j}"

    NEW_PANE=$(tmux split-window -t "${SESSION}:${WINDOW_INDEX}" -v -P -F '#{pane_id}')
    CMD="codex agent start --config engineer.json --env agent_id=${ENGINEER_ID} --env spec=${SPEC_NAME} --env log_dir=${LOG_DIR}"

    tmux send-keys -t "${NEW_PANE}" "$CMD" C-m
  done
done

########################################
# Reviewers
########################################

for ((i = 1; i <= ORCH; i++)); do
  WINDOW_INDEX=$((i - 1))

  for ((j = 1; j <= REV; j++)); do
    REVIEWER_ID="${SPEC_NAME}-reviewer-${i}-${j}"

    NEW_PANE=$(tmux split-window -t "${SESSION}:${WINDOW_INDEX}" -h -P -F '#{pane_id}')
    CMD="kiro agent start --config reviewer.json --env agent_id=${REVIEWER_ID} --env spec=${SPEC_NAME} --env log_dir=${LOG_DIR}"

    tmux send-keys -t "${NEW_PANE}" "$CMD" C-m
  done
done

echo "Multi-agent tmux session created: ${SESSION}"
exit 0
