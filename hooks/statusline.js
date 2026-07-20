#!/usr/bin/env node
// orchestra — statusline badge for Claude Code
//
// Usage in ~/.claude/settings.json:
//   "statusLine": { "type": "command", "command": "node /path/to/hooks/statusline.js" }
//
// Renders [ORCHESTRA], plus a codex marker when that route is live. Claude Code allows
// only one statusLine command, so if the caveman plugin is also installed its badge is
// rendered here too rather than being crowded out.

const fs = require('fs');
const path = require('path');
const { claudeDir, codexAvailable } = require('./detect-codex');

const ORCHESTRA_COLOR = '\x1b[38;5;39m'; // blue — distinct from caveman's orange
const CAVEMAN_COLOR = '\x1b[38;5;172m';
const RESET = '\x1b[0m';

const parts = [];

parts.push(
  // ASCII only — a non-ASCII separator renders as mojibake on legacy Windows consoles.
  ORCHESTRA_COLOR + (codexAvailable() ? '[ORCHESTRA+codex]' : '[ORCHESTRA]') + RESET
);

// Optional interop: render the caveman badge if that plugin is active. Absent for
// everyone else, which is the common case — this must never fail the statusline.
try {
  const flag = path.join(claudeDir, '.caveman-active');

  // Refuse symlinks. A local attacker could otherwise point the flag at an arbitrary
  // file and have the statusline render its bytes — including terminal escape
  // sequences — on every keystroke.
  if (!fs.lstatSync(flag).isSymbolicLink()) {
    // Hard-cap the read and strip anything outside [a-z0-9-] before it reaches the
    // terminal, then whitelist known modes; render nothing rather than attacker bytes.
    const mode = fs
      .readFileSync(flag, 'utf8')
      .slice(0, 64)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    const known = new Set([
      'lite', 'full', 'ultra',
      'wenyan-lite', 'wenyan', 'wenyan-full', 'wenyan-ultra',
      'commit', 'review', 'compress',
    ]);

    if (known.has(mode)) {
      const label = mode === 'full' ? '[CAVEMAN]' : '[CAVEMAN:' + mode.toUpperCase() + ']';
      parts.push(CAVEMAN_COLOR + label + RESET);
    }
  }
} catch (e) {
  // No caveman, no flag, unreadable flag — all mean "render nothing extra".
}

process.stdout.write(parts.join(' '));
