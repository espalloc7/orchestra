---
description: Switch orchestra back on — resume loading the orchestration rules
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/orchestra.js" on`

Report the result in one line. Mention that the change takes effect at the next session
start, since the rules are injected when a session begins.
