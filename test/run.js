#!/usr/bin/env node
// orchestra test suite. No dependencies — plain node.
//
//   node test/run.js
//
// Every case here maps to a bug that actually shipped during development. The scripts
// are run as real subprocesses against throwaway config directories, because the one
// failure mode that hurt most was verifying a copy of the code the failure had not come
// from.

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ACTIVATE = path.join(ROOT, 'hooks', 'activate.js');
const STATUSLINE = path.join(ROOT, 'hooks', 'statusline.js');
const CLI = path.join(ROOT, 'scripts', 'orchestra.js');

let passed = 0;
const failures = [];

function test(name, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestra-test-'));
  try {
    fn(new Fixture(dir));
    passed++;
    console.log('  ok  ' + name);
  } catch (error) {
    failures.push({ name, error });
    console.log('FAIL  ' + name + '\n      ' + error.message.split('\n')[0]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** A throwaway CLAUDE_CONFIG_DIR the scripts run against. */
class Fixture {
  constructor(dir) {
    this.dir = dir;
    this.settings({});
  }

  settings(value) {
    fs.writeFileSync(path.join(this.dir, 'settings.json'), JSON.stringify(value));
    return this;
  }

  withCodex() {
    return this.settings({ enabledPlugins: { 'codex@openai-codex': true } });
  }

  write(name, contents) {
    fs.writeFileSync(path.join(this.dir, name), contents);
    return this;
  }

  run(script, args = []) {
    return execFileSync(process.execPath, [script, ...args], {
      env: { ...process.env, CLAUDE_CONFIG_DIR: this.dir, ORCHESTRA_OFF: '' },
      encoding: 'utf8',
    });
  }

  activate() {
    return this.run(ACTIVATE);
  }
  statusline() {
    return this.run(STATUSLINE);
  }
  cli(command) {
    return this.run(CLI, [command]);
  }
}

// ---------------------------------------------------------------- activation

test('activation injects the rules', (f) => {
  const out = f.activate();
  assert.match(out, /ORCHESTRA ACTIVE v\d+\.\d+\.\d+/, 'should announce a version');
  assert.match(out, /## Routes/, 'should include the rules body');
});

test('activation reports the manifest version', (f) => {
  const expected = require(path.join(ROOT, '.claude-plugin', 'plugin.json')).version;
  assert.match(f.activate(), new RegExp('ORCHESTRA ACTIVE v' + expected.replace(/\./g, '\\.')));
});

test('codex present is reported as available', (f) => {
  assert.match(f.withCodex().activate(), /CODEX ROUTE: AVAILABLE/);
});

test('codex absent is reported as unavailable', (f) => {
  const out = f.activate();
  assert.match(out, /CODEX ROUTE: UNAVAILABLE/);
  assert.doesNotMatch(out, /CODEX ROUTE: AVAILABLE/);
});

test('malformed settings do not crash activation', (f) => {
  f.write('settings.json', '{ this is not json');
  assert.match(f.activate(), /ORCHESTRA ACTIVE/);
});

// ------------------------------------------------------------------- off switch

test('off flag stops the rules loading', (f) => {
  f.write('.orchestra-off', 'off\n');
  assert.strictEqual(f.activate().trim(), 'OK');
});

test('off flag hides the orchestra badge', (f) => {
  f.write('.orchestra-off', 'off\n');
  assert.strictEqual(f.statusline().trim(), '');
});

// Regression: switching orchestra off used to exit the statusline early, taking every
// other plugin's badge down with it even though those plugins were still active.
test('off flag leaves another plugin badge rendering', (f) => {
  f.write('.caveman-active', 'full');
  f.write('.orchestra-off', 'off\n');
  const out = f.statusline();
  assert.match(out, /CAVEMAN/, 'caveman badge must survive orchestra being off');
  assert.doesNotMatch(out, /ORCHESTRA/, 'orchestra badge must be hidden');
});

// --------------------------------------------------------------- statusline

test('badge reflects codex availability', (f) => {
  assert.match(f.withCodex().statusline(), /\[ORCHESTRA\+codex\]/);
  assert.match(f.settings({}).statusline(), /\[ORCHESTRA\]/);
});

test('badge is ASCII only', (f) => {
  // A non-ASCII separator renders as mojibake on legacy Windows consoles.
  const visible = f.withCodex().statusline().replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(/^[\x20-\x7e\s]*$/.test(visible), 'unexpected non-ASCII in: ' + visible);
});

test('a tampered caveman flag cannot inject terminal escapes', (f) => {
  f.write('.caveman-active', '\x1b]8;;http://evil\x07pwned');
  const out = f.statusline();
  assert.doesNotMatch(out, /pwned/, 'unwhitelisted flag contents must not be rendered');
  assert.doesNotMatch(out, /\x1b\]/, 'OSC sequences must never reach the terminal');
});

// ---------------------------------------------------------------------- cli

test('cli off then on round-trips', (f) => {
  f.cli('off');
  assert.strictEqual(f.activate().trim(), 'OK', 'off should take effect');
  f.cli('on');
  assert.match(f.activate(), /ORCHESTRA ACTIVE/, 'on should restore the rules');
});

test('cli on is safe when already on', (f) => {
  assert.match(f.cli('on'), /is ON/);
});

test('cli status reports state and codex', (f) => {
  const out = f.withCodex().cli('status');
  assert.match(out, /state\s+on/);
  assert.match(out, /codex\s+detected/);
  f.write('.orchestra-off', 'off\n');
  assert.match(f.cli('status'), /state\s+OFF/);
});

// Regression: the badge ran from a working tree while the hook ran from the installed
// copy, so fixes landed in one and not the other and nothing reported the split.
test('cli status flags a statusline pointing at another copy', (f) => {
  f.settings({ statusLine: { type: 'command', command: 'node "/somewhere/else/hooks/statusline.js"' } });
  assert.match(f.cli('status'), /MISMATCH|BROKEN/);
});

test('cli status accepts this install as healthy', (f) => {
  f.settings({ statusLine: { type: 'command', command: 'node "' + STATUSLINE + '"' } });
  assert.match(f.cli('status'), /statusline\s+OK/);
});

// -------------------------------------------------------------------- report

console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.log('');
  for (const { name, error } of failures) console.log('--- ' + name + '\n' + error.message + '\n');
  process.exit(1);
}
