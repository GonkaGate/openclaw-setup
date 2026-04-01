# Design Pressure Test

Use this reference when the draft review sounds topically correct but still too
easy, too generic, or too close to a generic architecture review.

The goal is not more prose. The goal is to make the review prove why the point
matters and why the smallest response is enough.

## 1. Name The Claimed Design Guarantee

Before keeping a point, state:

- what the design appears to promise
- which seam owns that promise

If the review cannot say this cleanly, it is not ready to judge the design.

## 2. Name The Strongest Nearby Failure Story

Ask:

- what adjacent interpretation could still make this design unsafe or
  incoherent?
- what would a smart reviewer most plausibly assume is already covered when it
  is not?

Examples:

- contract shape looks stable, but runtime or serializer behavior changes it
- plugin boundary looks clean, but lifecycle order breaks visibility
- transaction ownership looks obvious, but the real operation escapes the
  intended boundary
- cache or Redis coordination looks cheap, but replay or TTL semantics change
  correctness
- the test plan sounds convincing, but the chosen layer cannot actually prove
  the risky behavior

## 3. Prove The Current Design Does Or Does Not Already Beat It

Ask:

1. Which part of the current design is supposed to handle the failure story?
2. Does the design artifact actually show that, or is the review filling in
   the missing mechanism from memory?
3. Is this a true flaw, or is the real issue missing proof?

Do not skip step 3. Missing detail and broken design are not always the same.

## 4. Reject The Tempting Dismissal

Force the closest easy dismissal to lose:

- `the implementation can figure that out later`
- `this is just an implementation detail`
- `the trade-off is obvious`
- `tests will catch it`
- `the platform probably handles that already`

If the dismissal still stands, demote the point.

## 5. Choose The Smallest Useful Response

Prefer the narrowest move that changes confidence materially:

- one boundary clarification
- one ownership correction
- one explicit trade-off statement
- one proof obligation
- one narrow design change

Do not jump to redesign if a smaller clarification or proof step would close
the gap.

## 6. State What Would Change The Verdict

Before finalizing, say:

- what direct evidence would remove the concern
- what extra detail would turn a missing-proof note into a real finding
- what runtime or design fact would downgrade severity

If you cannot say what would change the verdict, the point may still be too
vague.
