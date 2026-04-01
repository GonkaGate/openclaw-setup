# Execution Shape And Artifacts

Use this reference when the plan is stuck on execution shape rather than on
technical seam choice.

## Choose The Shape First

The plan should decide one primary shape before it starts listing phases.

## `direct`

Use when all are true:

- one narrow surface
- high confidence after a first read
- reversible with low blast radius
- no meaningful state or compatibility window
- no parallel handoff needed

Preferred output:

- short inline plan is usually enough
- validation can stay close to the single execution block

## `phased`

Default for non-trivial implementation work.

Use when at least one is true:

- more than one boundary or risk seam is active
- schema, state, contract, or runtime order matters
- rollback or mitigation deserves explicit notes
- the plan will be handed to another coder or agent
- validation should happen between slices, not only at the end

Default rhythm:

`phase -> review/reconcile -> validate -> next phase`

Preferred output:

- `docs/plans/<feature>-implementation-plan.md` for long, handoff, or risky
  work

## `parallelized`

Use only when all are true:

- write scopes are genuinely disjoint
- dependencies between lanes are explicit
- no lane silently changes the contract another lane assumes
- there is a real fan-in checkpoint before downstream work continues
- validation can prove each lane independently enough to make fan-in honest

Parallelization is not free speed.
If two lanes both touch migration order, Redis state protocol, public contract,
plugin registration order, or shared workflow truth, treat that as a reason to
stay phased unless proven otherwise.

## Artifact Placement

Use this rule:

1. Keep the plan inline only for `direct` or very small bounded work.
2. Use `docs/plans/<feature>-implementation-plan.md` for non-trivial,
   parallelized, long, or handoff-driven work.
3. Keep `spec.md` as the decision source and only the control summary of the
   implementation plan when a separate plan file exists.
4. Split out `docs/plans/<feature>-test-plan.md` only when proof obligations
   are large enough to hide the core execution plan or need their own strategy
   work.

## Phase Anatomy

Each real phase should usually answer:

- what result this phase establishes
- what it depends on
- what it unlocks
- how it will be validated
- what rollback or mitigation matters if it fails

If a phase cannot answer those, it is probably too vague or should be merged.

## Red Flags

Do not call a plan `parallelized` when it really has:

- shared migration sequencing
- shared contract rollout
- shared Redis or workflow protocol change
- one lane that cannot be validated before the other starts depending on it
- cleanup work scheduled before the compatibility window is earned
