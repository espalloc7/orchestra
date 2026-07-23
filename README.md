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

Routes are an ordered list, not a menu — the first matching row wins, and skipping past
one for something cheaper needs a concrete reason. Ties between overlapping rows are
settled by explicit rules rather than by taste.

| # | Route | Matches when |
|---|---|---|
| 1 | no action | already done, wrong premise, or blocked on you |
| 2 | deep-reasoner | contested call, risky change, or the lead already failed once |
| 3 | Explore | read-only fan-out: where is X, which files touch Y |
| 4 | Codex | specifiable implementation across files, verification, independent review *(optional)* |
| 5 | fast-worker | boilerplate, tests, formatting, small well-specified edits |
| 6 | lead direct | planning, review, quality calls, edits too small to brief |

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

When it is installed, the rules hand the lead the one invocation it can actually make —
the `codex:codex-rescue` subagent. That single subagent covers every Codex job:
implementation, code review, and adversarial review are all just prompts to it, so the
lead runs them itself instead of handing the work back to you. The `/codex:` slash
commands are marked `disable-model-invocation`; the only ones worth typing are job control
(`:status`, `:result`, `:cancel`) over a job you started yourself.

## Staying loaded

The full rules load once, at session start. In a long session they sink under everything
that came after and compaction can summarise them away — which is when routing quietly
decays back into "the lead does it".

So a one-line reminder prints on each prompt: the ordered route list, the Codex call, and
when the `Route:` header is required. It is capped small on purpose — under 400
characters, tested — because it repeats every turn. It names only the routes this machine
actually has, and `/orchestra:off` silences it along with the rules.

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

One token in that file is substituted at load time: `{{CODEX_STATUS}}`, in the Codex row,
becomes either the invocation to use or a note that the route is absent. Keep it if you
want the route table to state its own availability where the decision is made.

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
  remind.js          one-line route reminder on each prompt
  state.js           shared: codex detection, on/off flag
  statusline.js      optional badge
rules/
  orchestration.md   the actual rules — single source of truth
scripts/orchestra.js CLI behind the commands
test/run.js          dependency-free suite
```

## License

MIT
