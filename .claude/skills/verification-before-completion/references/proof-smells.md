# Proof Smells

Use this file when a proposed proof set sounds plausible but low-signal.

These are common ways closeout work looks responsible while still failing to
prove the changed claim.

## Broadness Smells

- rerun the entire suite because the changed seam was not identified
- add both route and integration layers when one focused layer would prove the
  claim
- ask for a benchmark or load test when the real question is a single contract
  or lifecycle claim

## Mismatch Smells

- rely on typecheck or lint for changed runtime behavior
- rely on `app.inject()` for `listen()`, socket, or shutdown behavior
- rely on mocked DB or Redis proof when the claim depends on real semantics
- rely on happy-path proof when the risky claim is about rejection, failure, or
  recovery behavior

## Freshness Smells

- cite a green run from before the latest change
- treat "manual smoke looked fine" as proof without naming the seam and
  expected observation
- rely on neighboring-path evidence instead of the changed path

## Theater Smells

- "run tests and lint" with no claim mapping
- "CI is green" with no note on which checks matter
- "add more coverage" with no explanation of the uncovered risk
- "seems ready" while an unsupported claim is still visible

## Expert Drift Smells

- advice that would still read as correct for almost any backend change
- naming standard hygiene steps without a seam-specific proof argument
- using a broader suite instead of explaining why the narrower layer is not
  enough
- repeating repository invariants without tying them to the changed claim
- sounding reassuring without making the verdict more discriminating

## Smell Test

Ask:

1. If this check passes, what exact claim becomes proven?
2. If it fails, what verdict changes?
3. What smaller check would prove the same thing?

If those answers are weak, the proof item is probably theater.
