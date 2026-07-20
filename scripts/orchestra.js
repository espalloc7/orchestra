#!/usr/bin/env node
// orchestra CLI — backs the /orchestra:on, :off and :status commands.
//
//   node scripts/orchestra.js on | off | status

const fs = require('fs');
const path = require('path');
const { claudeDir, codexAvailable, orchestraOff } = require('../hooks/state');

const ROOT = path.join(__dirname, '..');
const FLAG = path.join(claudeDir, '.orchestra-off');

function version() {
  try {
    const manifest = path.join(ROOT, '.claude-plugin', 'plugin.json');
    return JSON.parse(fs.readFileSync(manifest, 'utf8')).version || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

function rulesSize() {
  try {
    return fs.readFileSync(path.join(ROOT, 'rules', 'orchestration.md'), 'utf8').length;
  } catch (e) {
    return 0;
  }
}

/**
 * Is the configured statusline the one belonging to *this* install?
 *
 * Pointing it at a different copy — a working tree, or a previous version's cache
 * directory — means the badge and the rules come from two different code bases and can
 * silently disagree. That is worth reporting, not just whether the file exists.
 */
function statuslineHealth() {
  const mine = path.join(ROOT, 'hooks', 'statusline.js');
  for (const file of ['settings.json', 'settings.local.json']) {
    try {
      const settings = JSON.parse(fs.readFileSync(path.join(claudeDir, file), 'utf8'));
      const command = settings.statusLine && settings.statusLine.command;
      if (!command) continue;
      const match = /"([^"]*statusline\.js)"/i.exec(command) || /(\S*statusline\.js)/i.exec(command);
      if (!match) return 'set to another statusline (not orchestra)';
      const configured = path.resolve(match[1]);
      if (configured === path.resolve(mine)) return 'OK — this install';
      if (!fs.existsSync(configured)) return 'BROKEN — points at a path that no longer exists:\n             ' + configured;
      return 'MISMATCH — points at a different copy:\n             ' + configured;
    } catch (e) {
      // Unreadable settings file — no evidence here, keep looking.
    }
  }
  return 'not configured';
}

function status() {
  const lines = [
    'orchestra   ' + version(),
    'state       ' + (orchestraOff() ? 'OFF' : 'on'),
    'rules       ' + rulesSize() + ' chars',
    'install     ' + ROOT,
    'statusline  ' + statuslineHealth(),
    'codex       ' + (codexAvailable() ? 'detected — Codex route available' : 'not installed — Codex route disabled'),
  ];
  return lines.join('\n');
}

const command = process.argv[2];

if (command === 'off') {
  fs.writeFileSync(FLAG, 'off\n');
  console.log('orchestra is OFF. Rules stop loading at the next session start.');
  console.log('Turn it back on with /orchestra:on');
} else if (command === 'on') {
  try {
    fs.unlinkSync(FLAG);
  } catch (e) {
    // Already on — removing a flag that is not there is not an error.
  }
  console.log('orchestra is ON. Rules load at the next session start.');
} else if (command === 'status') {
  console.log(status());
} else {
  console.log('usage: orchestra.js on | off | status');
  process.exit(1);
}
