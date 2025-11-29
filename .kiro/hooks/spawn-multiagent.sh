#!/usr/bin/env bash
set -euo pipefail

# Spawn a tmux multi-agent session using tmux-mcp style commands.
node <<'NODE'
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { randomUUID } = require('crypto');

const run = promisify(exec);

async function executeTmux(cmd) {
  const { stdout } = await run(`tmux ${cmd}`);
  return stdout.trim();
}

async function listSessions() {
  const format = "#{session_id}:#{session_name}:#{?session_attached,1,0}:#{session_windows}";
  try {
    const output = await executeTmux(`list-sessions -F '${format}'`);
    if (!output) return [];
    return output.split('\n').map(line => {
      const [id, name, attached, windows] = line.split(':');
      return { id, name, attached: attached === '1', windows: Number(windows) || 0 };
    });
  } catch {
    return [];
  }
}

async function findSessionByName(name) {
  const sessions = await listSessions();
  return sessions.find(session => session.name === name) || null;
}

async function createSession(name) {
  await executeTmux(`new-session -d -s "${name}"`);
  return findSessionByName(name);
}

async function listWindows(sessionId) {
  const format = "#{window_id}:#{window_name}:#{?window_active,1,0}";
  const output = await executeTmux(`list-windows -t '${sessionId}' -F '${format}'`);
  if (!output) return [];
  return output.split('\n').map(line => {
    const [id, name, active] = line.split(':');
    return { id, name, active: active === '1', sessionId };
  });
}

async function listPanes(windowId) {
  const format = "#{pane_id}:#{pane_title}:#{?pane_active,1,0}";
  const output = await executeTmux(`list-panes -t '${windowId}' -F '${format}'`);
  if (!output) return [];
  return output.split('\n').map(line => {
    const [id, title, active] = line.split(':');
    return { id, windowId, title, active: active === '1' };
  });
}

async function splitPane(targetPaneId, direction = 'vertical', size) {
  let splitCommand = 'split-window';
  splitCommand += direction === 'horizontal' ? ' -h' : ' -v';
  splitCommand += ` -t '${targetPaneId}'`;
  if (size !== undefined && size > 0 && size < 100) {
    splitCommand += ` -p ${size}`;
  }
  await executeTmux(splitCommand);
  const windowId = await executeTmux(`display-message -p -t '${targetPaneId}' '#{window_id}'`);
  const panes = await listPanes(windowId);
  return panes.length ? panes[panes.length - 1] : null;
}

async function executeCommand(paneId, command) {
  const escaped = command.replace(/'/g, "'\\''");
  await executeTmux(`send-keys -t '${paneId}' '${escaped}' Enter`);
  return randomUUID();
}

function toCount(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildCommand(cmd, env = {}) {
  const prefix = Object.entries(env).map(([key, val]) => `${key}=${shellQuote(val)}`);
  return [...prefix, cmd].join(' ');
}

(async () => {
  const stdin = fs.readFileSync(0, 'utf8');
  let cwd = process.cwd();
  if (stdin.trim()) {
    try {
      const parsed = JSON.parse(stdin);
      if (parsed && typeof parsed.cwd === 'string' && parsed.cwd) {
        cwd = parsed.cwd;
      }
    } catch {
      // Non-JSON input; ignore.
    }
  }

  try {
    process.chdir(cwd);
  } catch {
    process.exit(0);
  }

  const specName = path.basename(process.cwd());
  const specPath = path.join(process.cwd(), `${specName}.json`);
  if (!fs.existsSync(specPath)) {
    process.exit(0);
  }

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const orchestrators = toCount(spec.orchestrators, 1);
  const engineersPer = toCount(spec.engineers_per_orchestrator, 0);
  const reviewersPer = toCount(spec.reviewers_per_orchestrator, 0);
  const logDir = path.resolve(spec.log_dir || '.kiro/logs');

  fs.mkdirSync(logDir, { recursive: true });

  const sessionName = `${specName}-multiagent`;
  const existing = await findSessionByName(sessionName);
  if (existing) {
    process.exit(0);
  }

  const session = await createSession(sessionName);
  if (!session?.id) {
    throw new Error(`Failed to create session ${sessionName}`);
  }

  const windows = await listWindows(session.id);
  const firstWindow = windows[0];
  if (!firstWindow?.id) {
    throw new Error('No tmux window found to split.');
  }

  const panes = await listPanes(firstWindow.id);
  if (!panes.length) {
    throw new Error('No tmux pane found to run agents.');
  }

  const orchestratorPanes = [];
  let splitTarget = panes[0].id;

  orchestratorPanes.push(splitTarget);
  await executeCommand(
    splitTarget,
    buildCommand('kiro-cli chat --profile orchestrator', { LOG_DIR: logDir })
  );

  for (let i = 1; i < orchestrators; i++) {
    const newPane = await splitPane(splitTarget, 'vertical');
    if (!newPane?.id) {
      throw new Error(`Failed to create pane for orchestrator ${i}.`);
    }
    splitTarget = newPane.id;
    orchestratorPanes.push(newPane.id);
    await executeCommand(
      newPane.id,
      buildCommand('kiro-cli chat --profile orchestrator', { LOG_DIR: logDir })
    );
  }

  for (let i = 0; i < orchestrators; i++) {
    let target = orchestratorPanes[i] || splitTarget;

    for (let j = 0; j < engineersPer; j++) {
      const pane = await splitPane(target, 'vertical');
      if (!pane?.id) {
        throw new Error(`Failed to create pane for engineer ${i}-${j}.`);
      }
      target = pane.id;
      const agentId = `${specName}-engineer-${i}-${j}`;
      await executeCommand(
        pane.id,
        buildCommand('codex --config engineer.json', { LOG_DIR: logDir, AGENT_ID: agentId })
      );
    }

    for (let j = 0; j < reviewersPer; j++) {
      const pane = await splitPane(target, 'vertical');
      if (!pane?.id) {
        throw new Error(`Failed to create pane for reviewer ${i}-${j}.`);
      }
      target = pane.id;
      const agentId = `${specName}-reviewer-${i}-${j}`;
      await executeCommand(
        pane.id,
        buildCommand('kiro-cli chat --profile reviewer', { LOG_DIR: logDir, AGENT_ID: agentId })
      );
    }
  }
})().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
NODE
