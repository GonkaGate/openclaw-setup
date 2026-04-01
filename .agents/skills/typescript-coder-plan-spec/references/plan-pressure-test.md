# Plan Pressure Test

Use this reference when the draft plan sounds plausible but still too generic,
too broad, or too confident.

## Stronger-Slice Questions

Ask all of these before finalizing:

1. What is the strongest tempting smaller plan?
   - Why is it unsafe or incomplete here?
2. What is the strongest tempting broader plan?
   - Why is it unnecessary or wasteful here?
3. Which phase is actually blocked on missing design?
   - If one exists, remove it from executable work.
4. Which risky seam lacks rollout order?
   - Contract, migration, Redis protocol, workflow state, or proof.
5. What fails if two neighboring phases are swapped?
   - If nothing fails, the split may be fake or the order may be unjustified.
6. What proof is duplicated?
   - Trim duplicate checks that do not change confidence.
7. What stays intentionally out of scope?
   - Record it instead of padding the plan.

## Specialist-Value Check

Ask one more question before calling the plan good:

- Does the plan change sequencing, phase boundaries, proof, or risk handling
  in a concrete way?

If the honest answer is yes, the plan still needs sharper specialist value.

Look for at least one of these expert gains:

- a hidden blocker surfaced instead of being buried inside a phase
- a non-obvious phase boundary that protects a real invariant
- a stricter compatibility or cleanup window
- a more honest validation step that exposes what cheaper proof would miss
- a justified refusal to parallelize
- a clearer inline-versus-`docs/plans` artifact decision
- an explicit omitted area that a broader plan would pad in

## Smells

The plan is still weak if it:

- would look almost identical after removing the seam-specific constraints
- treats cleanup as free and immediate
- hides migration or state compatibility behind `update schema`
- uses `add tests` as reassurance instead of a proof obligation
- schedules validation only after all risky phases complete
- confuses blockers with executable work
- adds phases that do not unlock or protect anything

## Finish Rule

A plan is ready when:

- each phase has a real unlock or protection reason
- the strongest nearby smaller and broader plans both lose for a stated reason
- blockers are explicit
- validation and mitigation are attached to the phases that need them
