#!/usr/bin/env node
// orchestra — UserPromptSubmit reminder hook
//
// The full rules load once, at session start. In a long session they sink to the bottom
// of the context and compaction can summarise them away, so the lead starts imitating
// the last twenty messages instead of the route list — which is how every task quietly
// becomes `lead direct` again.
//
// This prints a compact reminder on each prompt. It is deliberately tiny: it repeats on
// every turn, so anything longer would cost tokens continuously and go blind through
// sheer repetition. It names the ordered list and the one invocation that is easiest to
// forget, and nothing else. The rules themselves stay in rules/orchestration.md.
//
// Silenced by the same $CLAUDE_CONFIG_DIR/.orchestra-off flag as the rules.

const { codexAvailable, orchestraOff } = require('./state');

if (orchestraOff()) {
  process.stdout.write('');
  process.exit(0);
}

// The route list must not name a route this machine does not have — pointing the lead
// at an unreachable row is the failure this plugin was fixing in the first place.
const codex = codexAvailable();

const routes = ['no action', 'orchestra:deep-reasoner', 'Explore']
  .concat(codex ? ['Codex'] : [])
  .concat(['orchestra:fast-worker', 'lead direct']);

const lines = [
  '[orchestra] Pick a route before acting. First match wins: ' + routes.join(' / ') + '.',
];

if (codex) {
  lines.push('Codex = Agent(subagent_type: "codex:codex-rescue").');
}

lines.push('Files changing, work delegated, or codebase read → lead with Route: / Reason:.');

process.stdout.write(lines.join(' '));
