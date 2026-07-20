#!/usr/bin/env node
// orchestra — Claude Code SessionStart activation hook
//
// Emits rules/orchestration.md as hidden SessionStart context, then appends a
// machine-specific note about whether the Codex route is actually available.
//
// The rules live in markdown rather than in this file so that the shipped text has a
// single source of truth that can be read and reviewed without reading JavaScript.
//
// Set ORCHESTRA_OFF=1 to disable injection for a session.

const fs = require('fs');
const path = require('path');
const os = require('os');

if (process.env.ORCHESTRA_OFF === '1') {
  process.stdout.write('OK');
  process.exit(0);
}

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

let rules;
try {
  rules = fs.readFileSync(path.join(__dirname, '..', 'rules', 'orchestration.md'), 'utf8');
} catch (e) {
  // Never block session start over a missing rules file.
  process.stdout.write('OK');
  process.exit(0);
}

/**
 * Is the openai-codex plugin installed and enabled?
 *
 * Checked against the user's settings files rather than the plugin cache, because a
 * cached-but-disabled plugin does not give us the /codex: commands the rules refer to.
 */
function codexAvailable() {
  for (const file of ['settings.json', 'settings.local.json']) {
    try {
      const raw = fs.readFileSync(path.join(claudeDir, file), 'utf8');
      const enabled = JSON.parse(raw).enabledPlugins || {};
      for (const [key, value] of Object.entries(enabled)) {
        if (value === true && /codex/i.test(key)) return true;
      }
    } catch (e) {
      // Missing or malformed file just means "no evidence here" — keep looking.
    }
  }
  return false;
}

const codexNote = codexAvailable()
  ? [
      'CODEX ROUTE: AVAILABLE — the openai-codex plugin is installed.',
      '',
      'Invocation:',
      '  /codex:rescue              implementation, investigation, fixes',
      '  /codex:review              code review of local git state',
      '  /codex:adversarial-review  challenge the approach, not the code',
      '  /codex:status | :result | :cancel   job control',
      '',
      'Two properties that change how you use this route:',
      '  - rescue is write-capable by default; Codex edits the working tree. Say',
      '    "review only" or "diagnose only" when you do not want edits.',
      '  - the codex-rescue subagent is a thin forwarder. It does not read the repo,',
      '    verify, or summarize. The review obligation is entirely the lead\'s —',
      '    nothing upstream is checking Codex\'s work.',
    ].join('\n')
  : [
      'CODEX ROUTE: UNAVAILABLE — the openai-codex plugin is not installed here.',
      'Treat the Codex row in the route table as absent. Route that work to lead direct',
      'or fast-worker instead, and do not tell the user to run /codex: commands.',
      '',
      'To enable it: /plugin marketplace add openai/codex-plugin-cc',
    ].join('\n');

process.stdout.write(
  'ORCHESTRA ACTIVE — route-based delegation. Follow these rules for every task.\n\n' +
    rules +
    '\n\n---\n\n' +
    codexNote
);
