---
name: coding-prompt-normalizer
description: "Turn rough, mixed-language, speech-to-text-like, repetitive, or partially specified coding requests into a high-signal task context brief and handoff prompt for agents working inside openclaw-setup. Use when the hard part is reconstructing what the user wants, preserving exact signals, deduplicating messy notes, grounding repo assumptions, or making a downstream LLM understand the task correctly. Prompt polish is secondary; the job is intent/context reconstruction plus repo-aware handoff packaging, not literal translation."
---

# Coding Prompt Normalizer

## Purpose

Turn noisy user task descriptions into context-rich handoff prompts that help a
coding agent understand the user's real task and start in the right place in
`openclaw-setup`.

The primary deliverable is not a polished prompt. The primary deliverable is an
accurate task context model: what the user wants, which exact signals matter,
what this repository implies, what is missing, and which assumptions are safe
enough to carry forward. The final handoff prompt is just the packaging for that
context.

Reconstruct intent, remove noise, preserve exact technical literals, choose the
right task mode, and inject only the repository context that materially changes
execution.

## Use This Skill For

- rough notes, pasted chat fragments, or dictated transcripts
- mixed-language coding requests
- requests like "turn this into a normal prompt", "package this for Codex", or
  "rewrite this for an agent"
- repetitive, nonlinear, partially explained tasks where the downstream agent
  still needs accurate task context before it can act

## Do Not Use It For

- generic translation with no repository work
- writing the code, spec, or review itself; this skill prepares the context and
  handoff prompt
- inventing files, behaviors, or product decisions that the repo does not
  support

## Relationship To Neighbor Skills

- Use this skill first when the main problem is poor task phrasing.
- After the task context is reconstructed, downstream work may use repo skills
  such as `typescript-coder`, `technical-design-review`,
  `verification-before-completion`, or `spec-first-brainstorming`.
- Do not turn this skill into a replacement for those domain skills. Its job is
  to create a better starting context and handoff, not to own the whole
  workflow.

## Workflow

1. Capture and normalize the raw input.
   - Load `references/input-normalization.md`.
   - Remove filler, loops, false starts, and duplicated fragments.
   - Keep code-like literals verbatim.
   - Treat repetition as evidence: collapse duplicates, but preserve repeated
     emphasis when it changes priority, urgency, or non-goals.
2. Infer the task mode.
   - Choose one primary mode:
     `implementation`, `bug-investigation`, `review-read-only`, `refactor`,
     `planning-spec`, `architecture-analysis`, `docs-and-messaging`, or
     `tooling-prompting`.
   - If two modes are present, choose the one that changes the downstream
     agent's first action.
3. Decide whether the request is ready for direct execution.
   - Use a direct coding prompt only when the requested change, likely target
     surface, and success criteria are sufficiently inferable, and the work
     looks like a bounded local change.
   - Default to `bug-investigation` when symptoms are clear but the fix is not.
   - Default to `planning-spec` or `architecture-analysis` when the request is
     too ambiguous for safe coding.
   - Default to `planning-spec` for non-trivial or hard-to-reverse work such as
     public CLI UX changes, product-invariant changes, secret-handling changes,
     config write or permission changes, validation-flow changes, or broad
     repository-wide refactors.
   - Review requests stay read-only.
4. Build the task context model.
   - Separate explicit user signals, repo-grounded facts, inferred assumptions,
     missing context, and open questions.
   - Preserve exact literals before interpreting them.
   - Keep uncertainty visible instead of smoothing it away for prompt polish.
5. Select repository context.
   - Load `references/repo-context-routing.md`.
   - Include only the repo facts, docs, constraints, and code areas that
     materially affect this task.
   - Prefer `2-5` targeted points over a project summary.
6. Compose the handoff prompt.
   - Do not mention the source language unless the user explicitly asks.
   - Default the output prompt to English because the repo docs, code, and
     agent instructions are English-first.
   - If the user explicitly requests another output language, honor that.
   - Write for an agent that already has repo access and knows how to inspect
     files, edit code, and navigate the workspace.
   - Keep the handoff dense, context-rich, and action-oriented.
7. Run a final quality gate.
   - No hallucinated files, requirements, or product decisions.
   - No generic stack dump.
   - Exact literals preserved.
   - User intent, repo facts, assumptions, and open questions are not blurred
     together.
   - Assumptions and open questions explicit where certainty is weak.

## Literal Preservation Rules

- Preserve exact file paths, CLI commands, env vars, code identifiers, config
  keys, model ids, field names, and domain terms verbatim.
- Wrap preserved literals in backticks inside the final handoff prompt.
- Do not "improve" or rename tokens like `~/.openclaw/openclaw.json`,
  `gp-...`, `openclaw setup`, `openclaw gateway`,
  `npx @gonkagate/openclaw verify`, `models.providers.openai.baseUrl`, or
  `agents.defaults.model.primary`.
- If transcript noise makes a literal uncertain, keep that uncertainty explicit.
  Use a phrase like `Possible original literal:` rather than silently
  normalizing it.
- Preserve user constraints exactly when they change execution:
  `read-only`, `do not edit files`, `no refactor`, `investigate first`,
  `do not touch docs`, `keep owner-only permissions`, `do not change public
  flow`.

## Readiness Rules

Emit an `implementation` or `refactor` handoff only when all are true:

- the requested change is understandable
- the likely code area is narrow enough to inspect first
- ambiguity does not materially change the execution path
- the work does not appear to change fixed product invariants, public onboarding
  UX, secret-handling rules, runtime verification semantics, or other
  hard-to-reverse behavior

Emit a `bug-investigation` handoff when any are true:

- the text is symptom-first or regression-first
- the root cause is unclear
- multiple ownership seams could explain the behavior

Emit a `review-read-only` handoff when the user asks to inspect, review, audit,
or explicitly avoid edits.

Emit a `planning-spec` or `architecture-analysis` handoff when:

- the task is exploratory or cross-cutting
- requirements are incomplete
- the user asks for a plan, spec, or design direction
- the request touches product-contract changes from `AGENTS.md`
- resolving ambiguity is more important than coding immediately

Emit a `docs-and-messaging` handoff when the task is mainly about `README.md`,
`docs/`, `CHANGELOG.md`, or `AGENTS.md` accuracy and alignment.

When ambiguity remains high, keep `Assumptions` and `Open questions` short but
explicit. Do not hide uncertainty behind polished wording.

## Output Template

Adapt the sections to the mode. Default order:

- `Objective`
- `User intent and context`
- `Relevant repository context`
- `Likely relevant code areas / files`
- `Problem statement` or `Requested change`
- `Constraints / preferences / non-goals`
- `Acceptance criteria` or `Expected outcome`
- `Validation / verification`
- `Assumptions / open questions`

Mode-specific adjustments:

- `review-read-only`
  - say the task is read-only
  - ask for findings first
  - replace implementation acceptance criteria with review deliverable
    expectations
- `bug-investigation`
  - ask the agent to confirm the symptom path and identify root cause before
    coding
  - describe the expected evidence, likely seams, and what should be verified
- `planning-spec` and `architecture-analysis`
  - emphasize boundaries, risks, missing information, and candidate decisions
    rather than edits
- `docs-and-messaging`
  - emphasize user-visible truthfulness and keeping `AGENTS.md`, `README.md`,
    `docs/`, and `CHANGELOG.md` aligned when behavior changes
- `tooling-prompting`
  - keep repo context focused on local skills, prompts, agents, and workflow
    surfaces

Use `User intent and context` to preserve the reconstructed ask, priority
signals, and missing context before listing repo facts. Keep the prompt compact.
Do not force all sections when `1-2` focused paragraphs do the job better.

## Context Handoff Rules

- Start with the real objective, not with "rewrite this prompt".
- Prefer concrete repo surfaces when they are grounded by the input or the
  repository.
- Turn vague references like "here", "this config", or "that verify flow" into
  hypotheses only when the repo strongly supports one interpretation.
- Separate grounded repo facts from assumptions.
- Mention the first files or docs to inspect when that is reasonably inferable.
- Keep validation realistic: focused tests, targeted CLI verification, or
  nearby doc sync checks. Do not default to broad repo-wide validation unless
  the change is broad.
- Do not repeat repo-wide instructions unless they materially affect this
  task.
- Do not propose product changes like custom base URL input, `.env` writing, or
  shell profile edits unless the user explicitly asks for a product-contract
  change and the prompt frames it as such.
- Do not optimize mainly for eloquence. A plain handoff with the right context
  is better than a polished prompt that hides uncertainty or user intent.

## Examples

### Example 1: Implementation Prompt

Input:

```text
Turn this into a clean prompt for Codex. We need a small fix in
`src/install/merge-settings.ts` so `agents.defaults.models` is only merged when
it already exists. Preserve unrelated config keys and do not broaden the public
flow.
```

Output:

```text
Objective
Make the smallest change in `src/install/merge-settings.ts` so
`agents.defaults.models` is only merged when it already exists, while
preserving unrelated OpenClaw config keys and keeping the public onboarding
flow unchanged.

Relevant repository context
- `AGENTS.md` treats merge behavior in `src/install/merge-settings.ts` as a
  sensitive product surface.
- The installer must preserve unrelated settings and should only merge
  `agents.defaults.models` when that allowlist already exists.
- Public onboarding behavior should stay centered on `npx @gonkagate/openclaw`
  and should not widen product scope.

Likely relevant code areas / files
- `src/install/merge-settings.ts`
- `src/types/settings.ts`
- `test/merge-settings.test.ts`
- `AGENTS.md` if the public merge contract changes

Requested change
Inspect the current merge behavior and make the smallest safe implementation
change that preserves existing config data while keeping
`agents.defaults.models` optional.

Validation / verification
- Update or add focused coverage in `test/merge-settings.test.ts`.
- Run the relevant test slice, and broaden validation only if the touched logic
  clearly affects more of the install flow.

Assumptions / open questions
- Assumption: the current bug is in allowlist merge behavior rather than in the
  selected model ref generation.
```

### Example 2: Review Prompt

Input:

```text
Package this as a review prompt. Read-only. I think `src/install/verify-runtime.ts`
may be too optimistic around `openclaw gateway status --require-rpc --json`.
Need findings first, severity ordered, with file anchors. Focus on correctness.
```

Output:

```text
Objective
Perform a read-only correctness review of the runtime verification flow, with
findings first and ordered by severity.

Relevant repository context
- `npx @gonkagate/openclaw verify` is a read-only flow and must not mutate
  config or local runtime state.
- Runtime verification depends on `openclaw gateway status --require-rpc --json`,
  `openclaw health --json`, and `openclaw models status --plain`.
- `AGENTS.md` treats runtime verification semantics as part of the repository
  contract.

Likely relevant code areas / files
- `src/install/verify-runtime.ts`
- nearby tests in `test/verify-runtime.test.ts`
- `AGENTS.md` and `docs/how-it-works.md` if the implementation diverges from
  the documented contract

Review deliverable
Review the current implementation in read-only mode. Report findings first,
ordered by severity, with file anchors. Focus on correctness, behavioral
regressions, and mismatches between the documented verify contract and what the
code actually proves.
```
