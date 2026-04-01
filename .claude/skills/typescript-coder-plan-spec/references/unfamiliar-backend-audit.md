# Unfamiliar Backend Audit

Use this reference before writing a detailed plan in a codebase you do not yet
understand.

## Inspect In This Order

1. Existing task artifacts.
   - Spec, issue, ADR, bug report, or user goal.
2. Ownership surfaces.
   - Entry points, routes, services, plugins, adapters, or modules that
     appear to own the change.
3. Current proof surface.
   - Existing tests, harness utilities, validation scripts, or known check
     commands.
4. Stateful or rollout-sensitive surfaces.
   - Prisma migrations, Redis keys or scripts, background workers, workflow
     status storage, feature flags, or deploy notes.
5. Known constraints.
   - Runtime invariants, compatibility requirements, or existing rollout
     assumptions.

## What You Need Before Fine Sequencing

Do not jump into detailed phases until you can answer:

- what the current owner module is
- what downstream consumer or adapter depends on it
- whether real state changes are involved
- what proof surface already exists
- whether any change requires compatibility windows or staged rollout

## Honest Fallback

If those facts are still missing, the next correct output is not a fake plan.

Return one of:

- a short investigation checklist
- a blocker list
- or a conditional plan with explicit confidence limits
