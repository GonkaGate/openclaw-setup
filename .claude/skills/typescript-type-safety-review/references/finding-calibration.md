# Finding Calibration

Use this reference when deciding what kind of type-safety point you actually
have.

## Point Classes

- `finding`
  The current code makes a concrete safety claim that the compiler, runtime
  boundary, or public surface does not actually justify.
- `missing proof`
  The current path may be safe, but the visible evidence does not prove the
  key safety claim well enough.
- `residual risk`
  The current path may be acceptable, but a bounded risk remains and should be
  stated explicitly.

## Keep A Point Only If

You can answer all of these:

1. What exact safety surface is involved?
2. What guarantee is the code or type surface claiming?
3. Where does proof stop or become ambiguous?
4. What is the smallest safe fix or next proof step?

If you cannot answer those clearly, do not promote the point.

Also ask:

5. What expert delta does this point add beyond strong general TS knowledge?

If the answer is only "it reminds the reader of a common best practice," do
not promote the point.

## Missing-Proof Triggers

Prefer `missing proof` over `finding` when:

- the verdict depends on unseen `tsconfig` or lint posture
- the verdict depends on a parser, guard, or assertion helper defined
  elsewhere
- the verdict depends on emitted `.d.ts` or public export truth you have not
  checked
- the code shape suggests a risk, but the exact trust transition is still
  inferred

## Severity Guide

- `high`
  the mismatch can cause a real runtime trust leak, invalid state, consumer
  break, or misleading safety guarantee
- `medium`
  the code may still work, but the gap materially increases future misuse or
  review risk
- `low`
  the point is useful but bounded and should not outrank clearer unsoundness

## Confidence Guide

- `high`
  the code or declarations directly show the broken claim
- `medium`
  the safety surface is clear, but part of the runtime or consumer consequence
  is still inferred
- `low`
  the point mainly reflects missing proof or partial context

## Reject These Weak Patterns

- generic "be more type-safe" advice
- readability complaints dressed up as safety findings
- recommending a library without naming the broken claim
- treating absent context as proof of a bug
- promoting every trade-off or uncertainty to a blocker
