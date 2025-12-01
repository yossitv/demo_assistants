#!/bin/bash

# Agent Monitor for rag-chat-stream-backend
# Displays 4 codex agents in 2x2 layout

PANE1="%26"  # Task 1: Infrastructure
PANE2="%28"  # Task 2: SSE Chunks
PANE3="%27"  # Task 3: Controller
PANE4="%29"  # Task 4-6: Handler/CDK

clear

while true; do
  # Get terminal size
  COLS=$(tput cols)
  LINES=$(tput lines)
  HALF_COLS=$((COLS / 2 - 2))
  HALF_LINES=$((LINES / 2 - 3))
  
  # Clear screen and move to top
  tput cup 0 0
  
  echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
  echo "║ RAG Chat Stream Backend - Agent Monitor ($(date '+%H:%M:%S'))                        ║"
  echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
  
  # Top row
  echo "║ Task 1: Infrastructure & Utils          │ Task 2: SSE Chunk Generation      ║"
  echo "╟─────────────────────────────────────────┼───────────────────────────────────╢"
  
  # Capture panes
  P1=$(tmux capture-pane -t $PANE1 -p | tail -8)
  P2=$(tmux capture-pane -t $PANE2 -p | tail -8)
  P3=$(tmux capture-pane -t $PANE3 -p | tail -8)
  P4=$(tmux capture-pane -t $PANE4 -p | tail -8)
  
  # Display top row (Pane 1 and 2)
  for i in {1..8}; do
    LINE1=$(echo "$P1" | sed -n "${i}p" | cut -c1-$HALF_COLS | sed 's/$/                                        /' | cut -c1-$HALF_COLS)
    LINE2=$(echo "$P2" | sed -n "${i}p" | cut -c1-$HALF_COLS | sed 's/$/                                        /' | cut -c1-$HALF_COLS)
    printf "║ %-${HALF_COLS}s │ %-${HALF_COLS}s ║\n" "$LINE1" "$LINE2"
  done
  
  echo "╟─────────────────────────────────────────┼───────────────────────────────────╢"
  echo "║ Task 3: StreamingChatController         │ Task 4-6: Handler & CDK           ║"
  echo "╟─────────────────────────────────────────┼───────────────────────────────────╢"
  
  # Display bottom row (Pane 3 and 4)
  for i in {1..8}; do
    LINE3=$(echo "$P3" | sed -n "${i}p" | cut -c1-$HALF_COLS | sed 's/$/                                        /' | cut -c1-$HALF_COLS)
    LINE4=$(echo "$P4" | sed -n "${i}p" | cut -c1-$HALF_COLS | sed 's/$/                                        /' | cut -c1-$HALF_COLS)
    printf "║ %-${HALF_COLS}s │ %-${HALF_COLS}s ║\n" "$LINE3" "$LINE4"
  done
  
  echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Press Ctrl+C to exit | Refreshing every 5 seconds..."
  
  sleep 1
done
