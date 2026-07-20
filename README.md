# orchestra

Route-based delegation for Claude Code.

The main session **leads**: it understands the goal, plans, picks a route for each task,
delegates, reviews what comes back, and makes the final call. Specialist agents do the
work that does not need the lead's judgment.

The point is not "use more agents". The point is that every task gets an explicit
routing decision, so mechanical work stops consuming deep-reasoning budget and deep
reasoning stops being skipped on the calls that deserve it.

## Install

```
/plugin marketplace add espalloc7/orchestra
/plugin install orchestra@orchestra
/reload-plugins
```

That is the whole setup. The rules load automatically at the start of every session, in
every project — there is nothing to paste into a `CLAUDE.md`.

## What you get

**Routes.** Every task is assigned one before work starts, and the choice is stated in
one sentence:

| Route | For |
|---|---|
| lead direct | planning, decomposition, review, quality calls, edits too small to brief |
| Explore | read-only fan-out: where is X, which files touch Y |
| fast-worker | boilerplate, tests, formatting, small well-specified edits |
| deep-reasoner | isolated second opinion before a risky change; root cause on a clean context |
| Codex | well-specified implementation, verification, independent review *(optional — see below)* |
| no action | already done, wrong premise, or blocked on you |

**Two agents**, `deep-reasoner` (opus, high effort) and `fast-worker` (sonnet, low
effort). Effort is attached to the route rather than to the session, so deep reasoning
is billed when it is actually chosen instead of on every trivial turn.

**Guardrails** that exist because their absence is expensive:

- an escalation ladder, so a failing task escalates instead of looping
- parallel delegation in one message, and no second agent re-deriving context the first
  one already has
- delegated output is never accepted without review — a subagent reporting success is a
  claim, not a verification
- confirmation required before broad, risky, or destructive changes

**A quieter response format.** The `Route:` / `Reason:` header appears when files change
or work is delegated, and is skipped for plain questions.

## Codex is optional

The Codex route lights up only if the [openai-codex](https://github.com/openai/codex-plugin-cc)
plugin is installed. The activation hook checks at session start and tells the model
which case it is in, so nothing breaks if you do not use Codex — that work routes to the
lead instead, and you will not be told to run commands you do not have.

## Statusline badge

Optional. Renders `[ORCHESTRA]`, or `[ORCHESTRA+codex]` when the Codex route is live —
a one-glance answer to "did the rules actually load?"

You do not need to find the path yourself: the activation hook detects a missing
statusline and offers to configure it, with the correct absolute path for your install,
on your next session. Accept and it is done.

Claude Code allows only one `statusLine` command. If you already have one configured,
orchestra leaves it alone and never asks again. If you use the
[caveman](https://github.com/JuliusBrussee/caveman) plugin, its badge is rendered
alongside orchestra's rather than being crowded out.

## Customizing

The rules are plain markdown in [`rules/orchestration.md`](rules/orchestration.md), read
at session start. Fork the repo, edit that file, and reinstall from your fork. There is
no rule text hidden in the JavaScript.

To silence orchestra for one session without uninstalling:

```
ORCHESTRA_OFF=1 claude
```

## Layout

```
.claude-plugin/
  plugin.json        manifest + SessionStart hook registration
  marketplace.json   lets this repo serve itself as a marketplace
agents/              deep-reasoner, fast-worker
hooks/
  activate.js        reads the rules, detects Codex, injects both
  detect-codex.js    shared plugin detection
  statusline.js      optional badge
rules/
  orchestration.md   the actual rules — single source of truth
```

## License

MIT
