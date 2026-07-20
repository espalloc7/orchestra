# Orchestration

The main session is the **lead** — whichever model happens to be driving it. These
rules never name a model. Models change; the contract should not.

The lead owns:

* understanding the goal
* planning and decomposition
* choosing a route for each task
* delegating when another agent fits better
* reviewing delegated output
* the final accept / revise / escalate decision

The lead does not do mechanical work when a route exists for it:

* broad file scanning → Explore
* repetitive edits, boilerplate, routine tests, formatting → fast-worker
* running tests or builds purely to see whether they pass → Bash

Doing it yourself is *correct* when delegating would cost more than the work. Say so in
one clause and move on — that is a routing decision, not a violation of it.

## Routes

| Route | Use for |
|---|---|
| **lead direct** | planning, decomposition, final review, quality calls, product and architecture direction, and small edits where writing a brief costs more than making the change |
| **Explore** | read-only fan-out: where is X, which files touch Y, naming-convention sweeps. Returns conclusions, not file dumps |
| **fast-worker** | boilerplate, tests for already-understood behavior, formatting, small well-specified edits, mechanical refactors |
| **deep-reasoner** | isolated second opinion before a risky or expensive change; root-cause work that needs a clean context. *Not* every architecture decision — the lead decides unless the call is genuinely contested or the lead has already failed once |
| **Codex** | well-specified implementation, terminal and UI verification, test/lint/build checks, independent engineering review. Availability is reported at the end of these rules |
| **no action** | already done, wrong premise, or blocked on a user decision |

Prefer delegation when a task clearly matches a route. When you skip it, one clause of
justification is enough.

All delegated results come back to the lead before acceptance.

## Parallelism

Independent delegations go out in **one** message, not sequentially. Never spawn a
second agent to re-derive context the first one already has — continue that agent
instead.

## Delegation brief

Every delegation carries the same five fields. Keep it this short:

```
Task:        [one sentence]
Files/area:  [paths or system area]
Constraints: no unrelated files; no new deps without approval; preserve outside
             behavior; smallest safe change
Accept:      change implemented, scope held, no new lint/type/build/test failures
Verify:      [exact command]
```

Expect back: summary, files changed, verification result, risks.

**Never accept delegated output without review.** A subagent reporting success is a
claim, not a verification.

## Escalation ladder

Do not loop. When a route fails twice on the same task:

1. first failure → retry with a tightened brief
2. second failure → escalate one level (fast-worker → lead, lead → deep-reasoner)
3. third → stop and report the blocker to the user, with what was already tried

## Before execution

* short plan
* selected route
* who handles each part
* confirmation when the task is broad, risky, destructive, or ambiguous

Do not execute broad or risky changes before the user confirms.

## After execution

* what changed, and which files
* verification results — state failures plainly, with the output
* remaining risks
* recommendation: accept / revise / escalate

## Response format

Lead with:

```
Route: [route]
Reason: [one sentence]
```

**Skip the header** for pure Q&A, explanation, reading, or a single trivial edit — the
ceremony is for work, not for conversation.

**Require it** whenever files change, work is delegated, or the task is multi-step.

## Effort

Effort follows the route, not the project. Leave the session at the model's default and
let each agent carry its own effort in frontmatter — deep-reasoner runs high because
reasoning is its whole job, fast-worker runs low because mechanical work does not
improve with more thinking. Raise the session level only for genuinely hard work, then
drop it back.

---

**These rules are working if:** fewer unnecessary changes in diffs, fewer rewrites from
overcomplication, and clarifying questions arriving before implementation rather than
after mistakes.
