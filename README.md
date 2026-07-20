# orchestra

Route-based delegation for Claude Code.

The main session **leads**: it plans, picks a route for each task, delegates, reviews
what comes back, and makes the final call. Specialist agents do the rest. Every task
gets an explicit routing decision, so mechanical work stops burning deep-reasoning
budget and deep reasoning stops being skipped where it matters.

## Install

```
/plugin marketplace add espalloc7/orchestra
/plugin install orchestra@orchestra
/reload-plugins
```

That is the whole setup. The rules load at the start of every session, in every
project — nothing to paste into a `CLAUDE.md`.

## Routes

| Route | For |
|---|---|
| lead direct | planning, review, quality calls, edits too small to brief |
| Explore | read-only fan-out: where is X, which files touch Y |
| fast-worker | boilerplate, tests, formatting, small well-specified edits |
| deep-reasoner | second opinion before a risky change; root cause on a clean context |
| Codex | well-specified implementation, verification, independent review *(optional)* |
| no action | already done, wrong premise, or blocked on you |

Ships two agents: `deep-reasoner` (opus, high effort) and `fast-worker` (sonnet, low
effort) — effort follows the route, not the session.

Also enforced: an escalation ladder instead of retry loops, parallel delegation in one
message, no accepting delegated output without review, and confirmation before broad or
destructive changes. The `Route:` / `Reason:` header shows up when work happens, not on
plain questions.

**Codex** is optional. That route lights up only if the
[openai-codex](https://github.com/openai/codex-plugin-cc) plugin is installed; without
it the work routes to the lead and you are never told to run commands you do not have.

## Statusline badge

Optional `[ORCHESTRA]` / `[ORCHESTRA+codex]` badge. You do not need to find any paths —
the plugin offers to set it up on your next session.

Claude Code allows only one statusline, so an existing one is left alone. The
[caveman](https://github.com/JuliusBrussee/caveman) badge renders alongside rather than
being crowded out.

## Turning it off

Create a flag file; delete it to switch back on.

```powershell
New-Item -ItemType File "$env:USERPROFILE\.claude\.orchestra-off"   # off
Remove-Item "$env:USERPROFILE\.claude\.orchestra-off"               # on
```

```sh
touch ~/.claude/.orchestra-off   # off
rm ~/.claude/.orchestra-off      # on
```

## Customizing

The rules are plain markdown in [`rules/orchestration.md`](rules/orchestration.md) —
no rule text hidden in the JavaScript. Fork, edit that file, install from your fork.

## Developing

Installing from a local directory **copies** the source into a versioned cache; it does
not link it. Your edits do nothing until you reinstall:

```
/plugin marketplace update orchestra
/plugin install orchestra@orchestra
/reload-plugins
```

The activation line reports the running version (`ORCHESTRA ACTIVE v1.1.0`). If it does
not match `.claude-plugin/plugin.json`, your install is stale.

## Layout

```
.claude-plugin/
  plugin.json        manifest + SessionStart hook registration
  marketplace.json   lets this repo serve itself as a marketplace
agents/              deep-reasoner, fast-worker
hooks/
  activate.js        reads the rules, detects Codex, injects both
  state.js           shared: codex detection, on/off flag
  statusline.js      optional badge
rules/
  orchestration.md   the actual rules — single source of truth
```

## License

MIT
