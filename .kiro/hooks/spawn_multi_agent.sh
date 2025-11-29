#!/bin/bash

# Read hook input
INPUT=$(cat)

# Extract spec name from working directory (or embed another rule)
SPEC=$(basename "$PWD")
SPEC_FILE="$PWD/${SPEC}.json"

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "Spec file not found: $SPEC_FILE" >&2
  exit 0
fi

# Extract fields
ORCH=$(jq '.orchestrators' "$SPEC_FILE")
ENG=$(jq '.engineers_per_orchestrator' "$SPEC_FILE")
REV=$(jq '.reviewers_per_orchestrator' "$SPEC_FILE")
LOG_DIR=$(jq -r '.log_dir' "$SPEC_FILE")

SESSION="${SPEC}-multiagent"

# Start tmux-mcp if needed
pgrep -f "tmux-mcp" > /dev/null
if [[ $? -ne 0 ]]; then
  echo "Starting tmux-mcp..."
  nohup node ~/.local/mcp/tmux-mcp/build/index.js >/tmp/tmux-mcp.log 2>&1 &
  sleep 1
fi

# Create session
mcp tmux-mcp create-session name="$SESSION" || true

# Start orchestrators
for (( i=1; i<=ORCH; i++ )); do
  ID="${SPEC}-orchestrator-${i}"
  mcp tmux-mcp split-pane paneId="0" direction="vertical" > /tmp/newpane.json
  PANE=$(jq -r '.paneId' /tmp/newpane.json)
  CMD="kiro agent start --config orchestrator.json --env agent_id=${ID} --env spec=${SPEC} --env log_dir=${LOG_DIR}"
  mcp tmux-mcp execute-command paneId="$PANE" command="$CMD"
done

# Engineers
for (( i=1; i<=ORCH; i++ )); do
  for (( j=1; j<=ENG; j++ )); do
    ID="${SPEC}-engineer-${i}-${j}"
    mcp tmux-mcp split-pane paneId="0" direction="vertical" > /tmp/newpane.json
    PANE=$(jq -r '.paneId' /tmp/newpane.json)
    CMD="codex agent start --config engineer.json --env agent_id=${ID} --env spec=${SPEC} --env log_dir=${LOG_DIR}"
    mcp tmux-mcp execute-command paneId="$PANE" command="$CMD"
  done
done

# Reviewers
for (( i=1; i<=ORCH; i++ )); do
  for (( j=1; j<=REV; j++ )); do
    ID="${SPEC}-reviewer-${i}-${j}"
    mcp tmux-mcp split-pane paneId="0" direction="horizontal" > /tmp/newpane.json
    PANE=$(jq -r '.paneId' /tmp/newpane.json)
    CMD="kiro agent start --config reviewer.json --env agent_id=${ID} --env spec=${SPEC} --env log_dir=${LOG_DIR}"
    mcp tmux-mcp execute-command paneId="$PANE" command="$CMD"
  done
done

echo "Multi-agent environment created in tmux session: $SESSION"

exit 0
