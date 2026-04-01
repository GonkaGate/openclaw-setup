# Readiness Claim Bar

Use this file before endorsing a closeout verdict.

The point is not to be pessimistic by default. The point is to stop unsupported
"ready" claims from slipping through on borrowed confidence.

## 1. Verified Ready

Use `verified ready` only when all are true:

- every material claim has fresh, direct evidence
- the retained checks actually exercised the risky seam
- no blocking proof item is still pending
- any residual risk is small enough that it does not secretly do the proof work

## 2. Conditionally Ready

Use `conditionally ready` when:

- the main proof set is sound
- one or two named checks are still pending
- the missing evidence is explicit and bounded
- the verdict would change if those checks fail

Name the exact blocking check. Do not phrase this as ready-now.

## 3. Not Yet Verified

Use `not yet verified` when any are true:

- a material claim has only stale or indirect evidence
- the chosen proof layer cannot honestly prove the changed seam
- the closeout story depends on tests or checks that were never run
- the retained evidence covers only happy path while the risky claim lives in
  failure, lifecycle, data, or state semantics

## 4. Accepted Risk Is Not Secret Proof

If the team is accepting residual risk, say so explicitly.

Do not convert:

- "we did not run the migration preflight"
- "we only mocked Redis"
- "we did not prove startup/shutdown behavior"

into a positive readiness claim by using softer wording.

## 5. Freshness Rules

Prefer evidence from the current change.

Treat these as weaker by default:

- previous CI before the latest edits
- an older branch or commit
- manual smoke with no recorded seam or expected behavior
- a broad suite pass that never exercised the changed boundary

## 6. Unsupported Claim Patterns

Do not accept:

- "probably ready"
- "the diff is small"
- "there were no test failures"
- "typecheck passed so runtime is fine"
- "the existing tests should cover it" without naming which claim they cover
