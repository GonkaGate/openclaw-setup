# Review Workflow

Use this reference when the design is broad, the codebase is unfamiliar, or
the first pass feels scattered.

## Evidence Order

Review in this order:

1. the design doc, ADR, or proposal text
2. interface, schema, and flow sketches
3. state, migration, or lifecycle notes
4. proof or test-plan claims
5. implementation-plan hints only when they reveal design intent

Prefer direct evidence in this order:

1. written design decisions
2. concrete shapes: schemas, module boundaries, sequence descriptions
3. explicit assumptions and non-goals
4. rollout or proving notes
5. narrative claims in chat

## Architecture-First Pass

Start every review with the base architecture frame:

- Which module or subsystem owns this behavior?
- Which dependencies point inward and which point outward?
- Does the composition root stay clear?
- Are config and error boundaries explicit?
- Does the publication surface stay intentional?

If the verdict turns on exact architecture boundary semantics rather than on
general structure alone, load `architecture-hard-anchors.md` before drafting
findings.

Do not skip this pass just because the design also touches data, runtime, or
quality topics.

## Adjacent Seam Pass

After the architecture pass, activate only the seams the design really touches.
Use `seam-activation-matrix.md`.

Identify the dominant adjacent seam first.
Do not flatten all active seams into one blended critique.

For each active seam, ask:

1. What guarantee is the design trying to preserve?
2. What neighboring failure story or conflicting interpretation is closest?
3. What trade-off is being chosen?
4. What evidence already supports the design?
5. What proof is still missing?

## Output Discipline

Prefer this internal order:

1. material findings
2. bounded trade-offs
3. missing-proof obligations
4. acceptable assumptions or open questions

If nothing clears the bar for a finding, say so plainly and keep only the
residual trade-offs or proof obligations.

## Stop Rule

Do not turn every unanswered detail into a finding.

A point becomes a material review point only when at least one is true:

- the design creates a real ownership or boundary conflict
- the design leaves a critical guarantee under-specified
- the design depends on a proof claim that is not yet justified
- the chosen trade-off is real enough that the reader should accept it
  explicitly rather than discover it later

If more than three adjacent seams activate, check whether:

- the proposal is actually bundling several designs into one review item
- the architecture base is still under-specified
- one dominant seam should be reviewed first, with the others treated as
  consequences rather than equal peers
