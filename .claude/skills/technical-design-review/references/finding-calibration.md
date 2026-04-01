# Finding Calibration

Use this reference when deciding what kind of design-review point you actually
have.

## Point Classes

- `finding`
  The current design contains a real flaw, contradiction, or unsafe
  under-specification in a concrete seam.
- `trade-off`
  The design may be acceptable, but it intentionally pays a real downside that
  should be stated explicitly.
- `missing proof`
  The design may be sound, but the current materials do not prove the key claim
  safely enough to treat it as ready.
- `acceptable assumption`
  The review sees an assumption, but it is bounded, legible, and not worth
  escalating beyond a note.

## Keep A Point Only If

You can answer all of these:

1. What exact seam and design surface are involved?
2. What guarantee or ownership rule is at risk?
3. Why does the current design or evidence not already settle it?
4. What is the smallest correction, explicit trade-off note, or proof step?

If you cannot answer those clearly, do not promote the point.

## Severity Guide

- `high`
  the flaw can cause a major boundary break, incoherent ownership, unsafe
  failure semantics, or a misleading readiness claim
- `medium`
  the design may still work, but the gap materially increases integration,
  rollout, or maintenance risk
- `low`
  the point is useful but bounded and should not outrank larger design issues

## Confidence Guide

- `high`
  the design artifact directly shows the flaw or contradiction
- `medium`
  the seam is clear, but part of the runtime consequence is still inferred
- `low`
  the point mostly reflects missing proof or missing design detail

## Reject These Weak Patterns

- generic architecture slogans
- adjacent implementation advice with no design consequence
- "needs more tests" with no proof target
- treating missing context as the same thing as a design flaw
- turning every downside into a blocker instead of a trade-off
