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

/**
 * Record which copy of the plugin this hook ran from.
 *
 * Commands and hooks do not necessarily resolve CLAUDE_PLUGIN_ROOT to the same place —
 * a directory-sourced marketplace keeps a cache copy alongside the working tree — and a
 * split between the two is invisible until their code diverges and they disagree.
 * Writing the root here lets /orchestra:status compare it against its own instead of
 * anyone having to guess.
 */
try {
  fs.writeFileSync(
    path.join(claudeDir, '.orchestra-last-root'),
    path.join(__dirname, '..') + '\n'
  );
} catch (e) {
  // Diagnostics must never block session start.
}

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

const codex = codexAvailable();

/**
 * The Codex route's invocation mechanism.
 *
 * Most /codex: commands are marked disable-model-invocation, so the lead cannot run
 * them at all, and the plugin's own rescue command warns that invoking it as a skill
 * re-enters the command and hangs the session. That leaves exactly one path the lead
 * can take. Advertising the others produced a route the lead could see but never use,
 * which it resolved by quietly falling through to another row.
 */
const codexNote = codex
  ? [
      'CODEX ROUTE: AVAILABLE — the openai-codex plugin is installed.',
      '',
      'How the lead invokes it. This is the only mechanism that works:',
      '',
      '  Agent(subagent_type: "codex:codex-rescue")   prompt = the delegation brief',
      '',
      '  - Codex is write-capable by default and edits the working tree. Open the',
      '    prompt with "review only" or "diagnose only" when you do not want edits.',
      '  - Do NOT call Skill("codex:rescue") — it re-enters the slash command and hangs',
      '    the session. Skill("codex:codex-rescue") does not exist.',
      '',
      'These are user-typed slash commands, marked disable-model-invocation. The lead',
      'cannot run them. Suggest them to the user; never attempt them yourself:',
      '',
      '  /codex:review              code review of local git state',
      '  /codex:adversarial-review  challenge the approach, not the code',
      '  /codex:status | :result | :cancel   job control',
      '',
      'The codex-rescue subagent is a thin forwarder. It does not read the repo, verify,',
      'or summarize. The review obligation is entirely the lead\'s — nothing upstream is',
      'checking Codex\'s work.',
    ].join('\n')
  : [
      'CODEX ROUTE: UNAVAILABLE — the openai-codex plugin is not installed here.',
      'Treat the Codex row in the route table as absent and fall through to the next',
      'matching row. Do not tell the user to run /codex: commands.',
      '',
      'To enable it: /plugin marketplace add openai/codex-plugin-cc',
    ].join('\n');

/**
 * Resolve the Codex row's status marker inside the route table itself.
 *
 * The table used to forward-reference a block printed after the rules, which put the
 * availability of a route somewhere other than the place the routing decision is made.
 */
rules = rules.replace(
  /\{\{CODEX_STATUS\}\}/g,
  codex
    ? 'Invoke with Agent(subagent_type: "codex:codex-rescue"); details at the end of these rules'
    : 'UNAVAILABLE in this install — skip this row'
);

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

/**
 * Which copy of the plugin is actually running?
 *
 * A local marketplace install copies the source into a versioned cache directory rather
 * than linking it, so edits to a working tree do not reach the installed hook until the
 * plugin is reinstalled. Printing the version makes that split visible: if this does not
 * match the version you just edited, you are looking at a stale install.
 */
function version() {
  try {
    const manifest = path.join(__dirname, '..', '.claude-plugin', 'plugin.json');
    return JSON.parse(fs.readFileSync(manifest, 'utf8')).version || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

process.stdout.write(
  'ORCHESTRA ACTIVE v' + version() +
    ' — route-based delegation. Follow these rules for every task.\n\n' +
    rules +
    '\n\n---\n\n' +
    codexNote +
    setupNote
);
