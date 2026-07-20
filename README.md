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

Also enforced: root cause over symptom patching, asking instead of assuming, reaching
for an existing skill before improvising, an escalation ladder instead of retry loops,
parallel delegation in one message, no accepting delegated output without review, and
confirmation before broad or destructive changes. The `Route:` / `Reason:` header shows
up when work happens, not on plain questions.

**Codex** is optional. That route lights up only if the
[openai-codex](https://github.com/openai/codex-plugin-cc) plugin is installed; without
it the work routes to the lead and you are never told to run commands you do not have.

## Statusline badge

Optional `[ORCHESTRA]` / `[ORCHESTRA+codex]` badge. You do not need to find any paths —
the plugin offers to set it up on your next session.

Claude Code allows only one statusline, so an existing one is left alone. The
[caveman](https://github.com/JuliusBrussee/caveman) badge renders alongside rather than
being crowded out.

## Commands

```
/orchestra:status   version, on/off state, install path, statusline health, codex route
/orchestra:off      stop loading the rules
/orchestra:on       resume
```

`status` is the first thing to run when something seems off. It catches the failures that
hide themselves: a stale install, and the rules, the commands or the badge running from
different copies of the plugin — which look fine until those copies diverge.

On and off take effect at the next session start, since the rules are injected when a
session begins.

## Customizing

The rules are plain markdown in [`rules/orchestration.md`](rules/orchestration.md) —
no rule text hidden in the JavaScript. Fork, edit that file, install from your fork.

## Developing

Installing from a local directory keeps a versioned copy in the plugin cache alongside
your working tree. Which one actually runs is not something to assume — run
`/orchestra:status` and read the `install` and `hook` lines. Point `statusLine` at the
path `install` reports, so the badge, the commands and the rules are one code base.

After editing, reinstall:

```
/plugin marketplace update orchestra
/plugin install orchestra@orchestra
/reload-plugins
```

The activation line reports the running version, and `/orchestra:status` shows it next to
the install path. If it does not match `.claude-plugin/plugin.json`, your install is
stale.

```
node test/run.js
```

No dependencies. Every case in the suite maps to a bug that actually shipped, and the
scripts run as real subprocesses against throwaway config directories — verifying a copy
of the code the failure did not come from is the mistake this suite exists to prevent.

## Layout

```
.claude-plugin/
  plugin.json        manifest + SessionStart hook registration
  marketplace.json   lets this repo serve itself as a marketplace
agents/              deep-reasoner, fast-worker
commands/            /orchestra:status, :on, :off
hooks/
  activate.js        reads the rules, detects Codex, injects both
  state.js           shared: codex detection, on/off flag
  statusline.js      optional badge
rules/
  orchestration.md   the actual rules — single source of truth
scripts/orchestra.js CLI behind the commands
test/run.js          dependency-free suite
```

## License

MIT
