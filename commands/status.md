---
description: Show orchestra's version, on/off state, install path, statusline health, and whether the Codex route is available
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/orchestra.js" status`

Present the output as-is. Do not summarize it.

If `statusline` reports MISMATCH or BROKEN, explain that the badge and the rules are
running from two different copies of the plugin, which makes them disagree silently, and
offer to repoint `statusLine` at the install path shown above.

If `orchestra` does not match the version the user expects, tell them the installed copy
is stale and that `/plugin marketplace update orchestra` followed by a reinstall is what
refreshes it.
