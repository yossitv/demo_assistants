#!/bin/bash

# Read environment variables
AGENT_ID="${AGENT_ID:-unknown}"
LOG_DIR="${LOG_DIR:-.}"
TOOL_NAME="${TOOL_NAME}"
TOOL_INPUT="${TOOL_INPUT}"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Generate ISO8601 timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create JSONL entry
LOG_ENTRY=$(cat <<EOF
{"timestamp":"$TIMESTAMP","event":"task_start","agent_id":"$AGENT_ID","tool_name":"$TOOL_NAME","tool_input":$TOOL_INPUT}
EOF
)

# Append to events.jsonl
echo "$LOG_ENTRY" >> "$LOG_DIR/events.jsonl"

# Safety validation
# Check for dangerous operations
if [[ "$TOOL_NAME" == *"write"* ]] || [[ "$TOOL_NAME" == *"delete"* ]] || [[ "$TOOL_NAME" == *"remove"* ]]; then
  # Check tool input for dangerous patterns
  if echo "$TOOL_INPUT" | grep -qE '(/etc/|rm -rf|rm -fr|sudo rm|del /s|format|mkfs)'; then
    echo "ERROR: Dangerous operation detected. Tool execution blocked for safety." >&2
    exit 2
  fi
fi

# Check for direct dangerous commands in tool name
if echo "$TOOL_NAME" | grep -qE '(rm|delete|format|mkfs)'; then
  if echo "$TOOL_INPUT" | grep -qE '(-rf|-fr|/etc/|--recursive|--force)'; then
    echo "ERROR: Dangerous operation detected. Tool execution blocked for safety." >&2
    exit 2
  fi
fi

# All checks passed
exit 0
