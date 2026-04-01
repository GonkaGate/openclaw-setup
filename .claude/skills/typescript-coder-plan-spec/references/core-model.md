# Core Model

Use this reference when the planning seam starts drifting into architecture,
implementation, or testing ownership.

## What This Skill Owns

An implementation plan is the control layer between approved design and code
execution.

It owns:

- execution slices
- order and dependencies
- checkpoints
- execution shape selection
- minimal validation per meaningful phase
- rollback or mitigation notes when sequencing risk matters
- explicit blockers and conditional assumptions

It does not own:

- choosing missing architecture boundaries
- deciding unresolved TS modeling shapes
- writing code
- designing a large standalone test strategy
- read-only findings against the design itself

## Unit Of Planning

The planning unit is a `change slice`.

A good slice is not just a file group.
It is the smallest execution increment that has:

1. one primary invariant or boundary under change
2. a clear prerequisite or unlock reason
3. a smallest honest validation step
4. bounded rollback or mitigation if it fails

If the work is large enough that another coder or agent should execute it from
the artifact itself, the plan should usually move into
`docs/plans/<feature>-implementation-plan.md` instead of staying inline.

## Default Ordering Rules

Prefer these defaults unless the task gives stronger evidence:

1. ownership or boundary groundwork before consumers
2. safe introduction before strict enforcement
3. compatibility window before cleanup
4. source-of-truth changes before mirrors, adapters, or docs that depend on
   them
5. validation close to the phase it proves, not delayed to the very end

## Blocker Rule

If a required design decision is missing, do not hide it inside the plan.

State it as one of:

- blocker that must be resolved first
- conditional branch in the plan
- handoff to a neighbor skill

The plan is not better because it sounds complete.
It is better because it separates executable work from missing decisions.
