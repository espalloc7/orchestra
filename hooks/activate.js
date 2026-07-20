#!/usr/bin/env node
// orchestra — Claude Code SessionStart activation hook
//
// Emits rules/orchestration.md as hidden SessionStart context, then appends a
// machine-specific note about whether the Codex route is actually available.
//
// The rules live in markdown rather than in this file so that the shipped text has a
// single source of truth that can be read and reviewed without reading JavaScript.
//
// Create $CLAUDE_CONFIG_DIR/.orchestra-off to disable injection.

const fs = require('fs');
const path = require('path');
const { claudeDir, codexAvailable, orchestraOff } = require('./state');

if (orchestraOff()) {
  process.stdout.write('OK');
  process.exit(0);
}

let rules;
try {
  rules = fs.readFileSync(path.join(__dirname, '..', 'rules', 'orchestration.md'), 'utf8');
} catch (e) {
  // Never block session start over a missing rules file.
  process.stdout.write('OK');
  process.exit(0);
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

/**
 * Should we ask Claude to offer statusline setup?
 *
 * Fires when no statusLine is configured at all, and also when one is configured but
 * points at an orchestra statusline that no longer exists — the version directory in a
 * plugin install path changes on upgrade, which would otherwise leave a silently blank
 * badge and no prompt to fix it.
 */
function statuslineNeedsSetup() {
  for (const file of ['settings.json', 'settings.local.json']) {
    try {
      const settings = JSON.parse(fs.readFileSync(path.join(claudeDir, file), 'utf8'));
      const command = settings.statusLine && settings.statusLine.command;
      if (!command) continue;
      const match = /([^"']*statusline\.js)/i.exec(command);
      if (match && !fs.existsSync(match[1])) return true; // stale orchestra path
      return false; // some statusline is configured; leave the user's choice alone
    } catch (e) {
      // Unreadable settings — no evidence either way, keep looking.
    }
  }
  return true;
}

let setupNote = '';
if (statuslineNeedsSetup()) {
  const command = 'node "' + path.join(__dirname, 'statusline.js') + '"';
  setupNote =
    '\n\n---\n\nSTATUSLINE SETUP AVAILABLE: orchestra ships a badge showing that the ' +
    'rules loaded, and whether the Codex route is live. It is not configured yet. ' +
    'To enable, add this to ' + path.join(claudeDir, 'settings.json') + ': ' +
    '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' } ' +
    'Offer to set this up, once, on first interaction — do not raise it again if declined.';
}

process.stdout.write(
  'ORCHESTRA ACTIVE — route-based delegation. Follow these rules for every task.\n\n' +
    rules +
    '\n\n---\n\n' +
    codexNote +
    setupNote
);
