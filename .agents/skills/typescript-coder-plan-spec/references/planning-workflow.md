# Planning Workflow

Use this workflow for every non-trivial implementation-planning task.

The goal is to produce an execution-ready plan, not generic advice about how
projects usually work.

## Required Pass

1. Name the change surface.
   - Feature, bug fix, refactor, migration, contract change, or stateful
     runtime change.
2. Check design readiness.
   - What is already decided?
   - What still blocks honest sequencing?
3. Start from architecture.
   - Owners, consumers, composition-root touchpoints, and publication
     boundaries.
4. Activate only the touched seams.
   - Load extra shared topic packs only when they change order, validation, or
     rollback.
5. Build the change slices.
   - Slice by invariant, dependency boundary, migration boundary, or rollback
     boundary.
6. Choose execution shape.
   - `direct`, `phased`, or `parallelized`.
   - Use `execution-shape-and-artifacts.md` when artifact placement or
     parallelism is the hard part.
7. Sequence the phases.
   - Explain why each phase belongs where it does.
   - Record dependencies and unlocks.
   - Prefer `phase -> review/reconcile -> validate -> next phase` by default.
8. Attach validation and mitigation.
   - Name the smallest honest check per meaningful phase.
   - Add rollback or mitigation when the blast radius is real.
9. Trim and pressure-test.
   - Remove duplicate or speculative steps.
   - Surface blockers and assumptions explicitly.

## Reject These Output Shapes

The answer is not ready if it:

- reads like a file inventory instead of an execution plan
- bundles several risky boundaries into one vague step
- hides unresolved design questions inside the phase list
- mentions tests only at the end without proof ownership
- ignores rollback or mitigation on risky data or state changes
- gives no reason why the phase order matters

## Output Template

Use this structure unless the caller asked for another one:

- `Plan Surface`
- `Assumptions / Blockers`
- `Execution Shape`
- `Active Seams`
- `Implementation Plan`
- `Validation`
- `Rollback / Mitigations`
- `Confidence`
